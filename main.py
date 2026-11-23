import os
import sqlite3
import hashlib
import secrets
from datetime import datetime
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, Header, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

DB_PATH = os.getenv("NOVA_DB_PATH", os.path.join(os.path.dirname(__file__), "nova_action_plan.db"))
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "schema.sql")
DB_VAULT_PASSWORD = os.getenv("NOVA_DB_VAULT_PASSWORD", "HOSSEIN1994@")

app = FastAPI(title="NOVA Action Plan API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def hash_password(plain: str) -> str:
    return hashlib.sha256(plain.encode("utf-8")).hexdigest()


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False, timeout=15.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn


def init_db() -> None:
    conn = get_conn()
    try:
        with open(SCHEMA_PATH, "r", encoding="utf-8") as sf:
            conn.executescript(sf.read())

        existing_admin = conn.execute("SELECT id FROM users WHERE username = ?", ("hossein",)).fetchone()
        if not existing_admin:
            conn.execute(
                "INSERT INTO users (username, full_name, role, password_hash) VALUES (?, ?, ?, ?)",
                ("hossein", "حسین علی‌شیری", "admin", hash_password("HOSSEIN1994@")),
            )

        existing_doc = conn.execute("SELECT COUNT(*) AS cnt FROM doctors").fetchone()
        if existing_doc and existing_doc["cnt"] == 0:
            seed_doctors = [
                ("دکتر داود امیرکاشانی", "48219", "فوق تخصص اطفال", "تهران", "منطقه ۳",
                 "تهران، منطقه ۳، خیابان ولیعصر، بالاتر از میرداماد", "شنبه تا سه‌شنبه ۸ تا ۱۳ و ۱۷ تا ۲۰", 1),
                ("دکتر رزیتا حسینی", "61904", "متخصص مغز و اعصاب", "تهران", "منطقه ۳",
                 "تهران، منطقه ۳، خیابان شریعتی، بالاتر از ظفر", "یکشنبه و سه‌شنبه ۱۶ تا ۲۰", 1),
                ("دکتر فرزانه روحانی", "73412", "اعصاب و روان اطفال", "تهران", "منطقه ۳",
                 "تهران، منطقه ۳، خیابان شریعتی، بیمارستان کودکان مفید", "دوشنبه و چهارشنبه ۹ تا ۱۳", 0),
                ("دکتر وحید قادری شرقی", "55890", "داخلی و غدد", "تهران", "منطقه ۴",
                 "تهران، منطقه ۴، پاسداران، خیابان دولت (کلاهدوز)", "چهارشنبه ۱۷ تا ۲۱", 0),
            ]
            conn.executemany(
                """INSERT INTO doctors
                   (name, medical_code, specialty, city, district, address, schedule, high_priority)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                seed_doctors,
            )
        conn.commit()
    finally:
        conn.close()


def log_audit(
    conn: sqlite3.Connection,
    user_id: Optional[int],
    username: str,
    event_type: str,
    entity_type: str,
    entity_id: Optional[str] = None,
    details: Optional[str] = None,
    ip_address: Optional[str] = None,
) -> None:
    conn.execute(
        """INSERT INTO audit_logs
           (user_id, username, event_type, entity_type, entity_id, details, ip_address)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (user_id, username, event_type, entity_type, entity_id, details, ip_address),
    )


def get_current_user(authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="توکن ورود معتبر نیست.")
    raw_token = authorization.replace("Bearer ", "", 1).strip()
    t_hash = hash_token(raw_token)
    conn = get_conn()
    try:
        row = conn.execute(
            """SELECT s.id AS session_id, u.id, u.username, u.full_name, u.role
               FROM user_sessions s
               JOIN users u ON u.id = s.user_id
               WHERE s.token_hash = ? AND s.is_active = 1 AND u.is_active = 1""",
            (t_hash,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=401, detail="نشست منقضی یا نامعتبر است.")
        return dict(row)
    finally:
        conn.close()


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/api/health")
def health_check() -> Dict[str, Any]:
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


class LoginRequest(BaseModel):
    username: str
    password: str


@app.post("/api/auth/login")
def login(payload: LoginRequest, request: Request) -> Dict[str, Any]:
    ip = request.client.host if request.client else "unknown"
    ua = request.headers.get("user-agent", "")[:240]
    conn = get_conn()
    try:
        user = conn.execute(
            "SELECT id, username, full_name, role, password_hash FROM users WHERE username = ? AND is_active = 1",
            (payload.username.strip(),),
        ).fetchone()
        if not user or user["password_hash"] != hash_password(payload.password):
            log_audit(conn, None, payload.username.strip(), "LOGIN_FAILED", "session", None, "رمز یا نام کاربری اشتباه", ip)
            conn.commit()
            raise HTTPException(status_code=401, detail="نام کاربری یا رمز عبور اشتباه است.")

        raw_token = secrets.token_urlsafe(32)
        conn.execute(
            "INSERT INTO user_sessions (user_id, token_hash, ip_address, user_agent) VALUES (?, ?, ?, ?)",
            (user["id"], hash_token(raw_token), ip, ua),
        )
        conn.execute("UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?", (user["id"],))
        log_audit(conn, user["id"], user["username"], "LOGIN", "session", None, "ورود موفق به سامانه", ip)
        conn.commit()
        return {
            "token": raw_token,
            "user": {
                "id": user["id"],
                "username": user["username"],
                "full_name": user["full_name"],
                "role": user["role"],
            },
        }
    finally:
        conn.close()


@app.post("/api/auth/logout")
def logout(request: Request, current_user: Dict[str, Any] = Depends(get_current_user), authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    ip = request.client.host if request.client else "unknown"
    raw_token = (authorization or "").replace("Bearer ", "", 1).strip()
    conn = get_conn()
    try:
        conn.execute(
            "UPDATE user_sessions SET is_active = 0, logout_at = CURRENT_TIMESTAMP WHERE token_hash = ?",
            (hash_token(raw_token),),
        )
        log_audit(conn, current_user["id"], current_user["username"], "LOGOUT", "session", None, "خروج از سامانه", ip)
        conn.commit()
        return {"status": "logged_out"}
    finally:
        conn.close()


class VaultUnlockRequest(BaseModel):
    password: str


@app.post("/api/vault/unlock")
def unlock_vault(payload: VaultUnlockRequest, request: Request, current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    ip = request.client.host if request.client else "unknown"
    if payload.password != DB_VAULT_PASSWORD:
        conn = get_conn()
        try:
            log_audit(conn, current_user["id"], current_user["username"], "VAULT_DENIED", "db_vault", None, "تلاش ناموفق برای باز کردن دیتابیس", ip)
            conn.commit()
        finally:
            conn.close()
        raise HTTPException(status_code=403, detail="رمز عبور دیتابیس اشتباه است.")

    conn = get_conn()
    try:
        rows = [dict(r) for r in conn.execute("SELECT * FROM doctors ORDER BY id DESC").fetchall()]
        log_audit(conn, current_user["id"], current_user["username"], "VAULT_UNLOCK", "db_vault", None, f"مشاهده {len(rows)} رکورد دیتابیس", ip)
        conn.commit()
        return {"unlocked": True, "records": rows}
    finally:
        conn.close()


class DoctorIn(BaseModel):
    name: str = ""
    medical_code: str
    specialty: str = ""
    city: str = "تهران"
    district: str = "محدوده مرکزی"
    address: str = ""
    schedule: str = ""
    high_priority: bool = False


@app.get("/api/doctors")
def list_doctors(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    conn = get_conn()
    try:
        rows = [dict(r) for r in conn.execute("SELECT * FROM doctors ORDER BY id ASC").fetchall()]
        return {"doctors": rows}
    finally:
        conn.close()


@app.post("/api/doctors")
def upsert_doctor(doc: DoctorIn, request: Request, current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    code = doc.medical_code.strip()
    if not code:
        raise HTTPException(status_code=400, detail="کد نظام پزشکی الزامی است.")
    ip = request.client.host if request.client else "unknown"
    conn = get_conn()
    try:
        existing = conn.execute("SELECT id FROM doctors WHERE medical_code = ?", (code,)).fetchone()
        if existing:
            conn.execute(
                """UPDATE doctors
                   SET name = ?, specialty = ?, city = ?, district = ?, address = ?, schedule = ?,
                       high_priority = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
                   WHERE medical_code = ?""",
                (doc.name.strip(), doc.specialty.strip(), doc.city.strip(), doc.district.strip(),
                 doc.address.strip(), doc.schedule.strip(), 1 if doc.high_priority else 0,
                 current_user["id"], code),
            )
            log_audit(conn, current_user["id"], current_user["username"], "UPDATE", "doctor", code, f"ویرایش پزشک {doc.name}", ip)
        else:
            conn.execute(
                """INSERT INTO doctors
                   (name, medical_code, specialty, city, district, address, schedule, high_priority, created_by, updated_by)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (doc.name.strip() or f"پزشک کد {code}", code, doc.specialty.strip(), doc.city.strip(),
                 doc.district.strip(), doc.address.strip(), doc.schedule.strip(),
                 1 if doc.high_priority else 0, current_user["id"], current_user["id"]),
            )
            log_audit(conn, current_user["id"], current_user["username"], "CREATE", "doctor", code, f"ثبت پزشک {doc.name}", ip)
        conn.commit()
        saved = dict(conn.execute("SELECT * FROM doctors WHERE medical_code = ?", (code,)).fetchone())
        return {"doctor": saved}
    finally:
        conn.close()


@app.delete("/api/doctors/{medical_code}")
def delete_doctor(medical_code: str, request: Request, current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    ip = request.client.host if request.client else "unknown"
    conn = get_conn()
    try:
        conn.execute("DELETE FROM doctors WHERE medical_code = ?", (medical_code,))
        log_audit(conn, current_user["id"], current_user["username"], "DELETE", "doctor", medical_code, "حذف پزشک", ip)
        conn.commit()
        return {"deleted": True, "medical_code": medical_code}
    finally:
        conn.close()


class PlanItemIn(BaseModel):
    visit_date_jalali: str
    visit_weekday: str
    doctor_name: str
    medical_code: str
    specialty: str = ""
    location: str = ""
    schedule: str = ""
    priority_label: str = "عادی"
    is_high_priority: bool = False


class SavePlanRequest(BaseModel):
    title: str
    daily_visits: int
    start_date_jalali: str
    end_date_jalali: str
    excluded_rules: str = "جمعه"
    min_gap_enabled: bool = False
    min_gap_days: int = 5
    items: List[PlanItemIn]


@app.post("/api/plans")
def save_plan(payload: SavePlanRequest, request: Request, current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    ip = request.client.host if request.client else "unknown"
    conn = get_conn()
    try:
        cur = conn.execute(
            """INSERT INTO action_plans
               (title, daily_visits, start_date_jalali, end_date_jalali, excluded_rules, min_gap_enabled, min_gap_days, created_by)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (payload.title, payload.daily_visits, payload.start_date_jalali, payload.end_date_jalali,
             payload.excluded_rules, 1 if payload.min_gap_enabled else 0, payload.min_gap_days, current_user["id"]),
        )
        plan_id = cur.lastrowid
        for it in payload.items:
            doc_row = conn.execute("SELECT id FROM doctors WHERE medical_code = ?", (it.medical_code,)).fetchone()
            conn.execute(
                """INSERT INTO action_plan_items
                   (plan_id, doctor_id, visit_date_jalali, visit_weekday, doctor_name, medical_code, specialty, location, schedule, priority_label, is_high_priority)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (plan_id, doc_row["id"] if doc_row else None, it.visit_date_jalali, it.visit_weekday,
                 it.doctor_name, it.medical_code, it.specialty, it.location, it.schedule,
                 it.priority_label, 1 if it.is_high_priority else 0),
            )
        log_audit(conn, current_user["id"], current_user["username"], "PLAN_GENERATE", "action_plan", str(plan_id), f"ذخیره پلن با {len(payload.items)} ویزیت", ip)
        conn.commit()
        return {"plan_id": plan_id, "items_count": len(payload.items)}
    finally:
        conn.close()


@app.get("/api/audit-logs")
def get_audit_logs(limit: int = 50, current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    conn = get_conn()
    try:
        rows = [dict(r) for r in conn.execute("SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?", (min(limit, 200),)).fetchall()]
        return {"logs": rows}
    finally:
        conn.close()
