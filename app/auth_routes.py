
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Task
from app.security import hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


class RegisterData(BaseModel):
    username: str
    email: str
    password: str


class LoginData(BaseModel):
    email: str
    password: str


class ProfileUpdateData(BaseModel):
    username: str


@router.post("/register")
def register(
    data: RegisterData,
    request: Request,
    db: Session = Depends(get_db)
):
    username = data.username.strip()
    email = data.email.strip().lower()

    if len(username) < 2:
        raise HTTPException(status_code=400, detail="Username is too short")

    if "@" not in email or "." not in email:
        raise HTTPException(status_code=400, detail="Enter a valid email")

    if len(data.password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least 8 characters"
        )

    existing_user = db.query(User).filter(User.email == email).first()

    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    is_first_user = db.query(User).count() == 0

    user = User(
        username=username,
        email=email,
        password_hash=hash_password(data.password)
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    # Give the first account ownership of older tasks
    if is_first_user:
        db.query(Task).filter(Task.user_id.is_(None)).update(
            {"user_id": user.id}
        )
        db.commit()

    request.session["user_id"] = user.id

    return {
        "message": "Account created successfully",
        "username": user.username
    }


@router.post("/login")
def login(
    data: LoginData,
    request: Request,
    db: Session = Depends(get_db)
):
    email = data.email.strip().lower()

    user = db.query(User).filter(User.email == email).first()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password"
        )

    request.session["user_id"] = user.id

    return {
        "message": "Login successful",
        "username": user.username
    }


@router.post("/logout")
def logout(request: Request):
    request.session.clear()

    return {
        "message": "Logged out successfully"
    }


@router.get("/me")
def current_user(
    request: Request,
    db: Session = Depends(get_db)
):
    user_id = request.session.get("user_id")

    if not user_id:
        raise HTTPException(status_code=401, detail="Please log in")

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        request.session.clear()
        raise HTTPException(status_code=401, detail="Please log in")

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email
    }


# UPDATE PROFILE
@router.put("/me")
def update_profile(
    data: ProfileUpdateData,
    request: Request,
    db: Session = Depends(get_db)
):
    user_id = request.session.get("user_id")

    if not user_id:
        raise HTTPException(status_code=401, detail="Please log in")

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        request.session.clear()
        raise HTTPException(status_code=401, detail="Please log in")

    username = data.username.strip()

    if len(username) < 2:
        raise HTTPException(
            status_code=400,
            detail="Username must contain at least 2 characters"
        )

    user.username = username

    db.commit()
    db.refresh(user)

    return {
        "message": "Profile updated successfully",
        "username": user.username,
        "email": user.email
    }
