from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Task, User

router = APIRouter(prefix="/api/tasks", tags=["Tasks"])


class TaskCreate(BaseModel):
    title: str
    description: str = ""
    status: str = "todo"
    priority: str = "medium"
    due_date: str | None = None


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    priority: str | None = None
    due_date: str | None = None


def get_logged_in_user(request: Request, db: Session):
    user_id = request.session.get("user_id")

    if not user_id:
        raise HTTPException(status_code=401, detail="Please log in")

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        request.session.clear()
        raise HTTPException(status_code=401, detail="Please log in")

    return user


def task_to_dict(task):
    return {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "status": task.status,
        "priority": task.priority,
        "due_date": task.due_date
    }


@router.get("/")
def get_tasks(request: Request, db: Session = Depends(get_db)):
    user = get_logged_in_user(request, db)

    tasks = db.query(Task).filter(Task.user_id == user.id).all()

    return [task_to_dict(task) for task in tasks]


@router.post("/")
def create_task(data: TaskCreate, request: Request,
                db: Session = Depends(get_db)):

    user = get_logged_in_user(request, db)

    task = Task(
        title=data.title,
        description=data.description,
        status=data.status,
        priority=data.priority,
        due_date=data.due_date,
        user_id=user.id
    )

    db.add(task)
    db.commit()
    db.refresh(task)

    return task_to_dict(task)


@router.put("/{task_id}")
def update_task(task_id: int, data: TaskUpdate, request: Request,
                db: Session = Depends(get_db)):

    user = get_logged_in_user(request, db)

    task = db.query(Task).filter(
        Task.id == task_id,
        Task.user_id == user.id
    ).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    updates = data.model_dump(exclude_unset=True)

    for key, value in updates.items():
        setattr(task, key, value)

    db.commit()
    db.refresh(task)

    return task_to_dict(task)


@router.patch("/{task_id}")
def partially_update_task(task_id: int, data: TaskUpdate,
                           request: Request,
                           db: Session = Depends(get_db)):

    user = get_logged_in_user(request, db)

    task = db.query(Task).filter(
        Task.id == task_id,
        Task.user_id == user.id
    ).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(task, key, value)

    db.commit()
    db.refresh(task)

    return task_to_dict(task)


@router.delete("/{task_id}")
def delete_task(task_id: int, request: Request,
                db: Session = Depends(get_db)):

    user = get_logged_in_user(request, db)

    task = db.query(Task).filter(
        Task.id == task_id,
        Task.user_id == user.id
    ).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    db.delete(task)
    db.commit()

    return {"message": "Task deleted successfully"}