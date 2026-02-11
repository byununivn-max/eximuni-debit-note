"""MSSQL meeting_schedule + meeting_contacts_gr 테이블 모델"""
from sqlalchemy import Column, Integer, String, DateTime, Text
from app.core.database import MSSQLBase


class MssqlMeetingSchedule(MSSQLBase):
    """미팅 일정 테이블 (MSSQL UNI_DebitNote.dbo.meeting_schedule)"""
    __tablename__ = "meeting_schedule"
    __table_args__ = {"schema": "dbo"}

    id_meeting = Column(Integer, primary_key=True, autoincrement=True)
    meeting_name = Column(Text, nullable=True)
    creator = Column(String(50), nullable=True)
    from_date = Column(DateTime, nullable=True)
    to_date = Column(DateTime, nullable=True)
    attend = Column(Text, nullable=True)
    location = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    note = Column(Text, nullable=True)
    status = Column(String(40), nullable=True)
    outlook_event_id = Column(Text, nullable=True)
    outlook_event_web_link = Column(Text, nullable=True)
    outlook_event_ical_uid = Column(Text, nullable=True)


class MssqlMeetingContact(MSSQLBase):
    """미팅 참석자 테이블 (MSSQL UNI_DebitNote.dbo.meeting_contacts_gr)"""
    __tablename__ = "meeting_contacts_gr"
    __table_args__ = {"schema": "dbo"}

    id_meeting_contact = Column(Integer, primary_key=True, autoincrement=True)
    id_meeting = Column(Integer, nullable=True)
    id_clients = Column(Integer, nullable=True)
