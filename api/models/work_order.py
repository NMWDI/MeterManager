from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from api.models.base import Base


class workOrderStatusLU(Base):
    __tablename__ = "work_order_status_lu"
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(String, nullable=False)


class workOrders(Base):
    __tablename__ = "work_orders"

    date_created: Mapped[DateTime] = mapped_column(DateTime, nullable=False)
    creator: Mapped[str] = mapped_column(String, nullable=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(String, nullable=True)
    meter_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("Meters.id"), nullable=False
    )
    status_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("work_order_status_lu.id"), nullable=False
    )
    notes: Mapped[str] = mapped_column(String, nullable=True)
    assigned_user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("Users.id"), nullable=True
    )
    ose_request_id: Mapped[int] = mapped_column(Integer, nullable=True)

    meter: Mapped["Meters"] = relationship()
    status: Mapped["workOrderStatusLU"] = relationship()
    assigned_user: Mapped["Users"] = relationship()
