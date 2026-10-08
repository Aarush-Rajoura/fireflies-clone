from datetime import datetime

from sqlalchemy import select

from app.models import IntegrationConnection
from app.repositories.base import Repository


class IntegrationConnectionRepository(Repository[IntegrationConnection]):
    model = IntegrationConnection

    def connected_at_by_key(self, user_id: int) -> dict[str, datetime]:
        stmt = select(
            IntegrationConnection.integration_key, IntegrationConnection.connected_at
        ).where(IntegrationConnection.user_id == user_id)
        return {key: at for key, at in self.session.execute(stmt)}

    def find(self, user_id: int, integration_key: str) -> IntegrationConnection | None:
        return self.session.scalar(
            select(IntegrationConnection).where(
                IntegrationConnection.user_id == user_id,
                IntegrationConnection.integration_key == integration_key,
            )
        )
