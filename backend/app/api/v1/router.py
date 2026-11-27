from fastapi import APIRouter
from app.api.v1.endpoints import health, auth, admin, dashboard, questions, exams, candidate, grading, notifications

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router)
api_router.include_router(admin.router)
api_router.include_router(dashboard.router)
api_router.include_router(questions.router)
api_router.include_router(exams.router)
api_router.include_router(candidate.router)
api_router.include_router(grading.router)
api_router.include_router(notifications.router)
