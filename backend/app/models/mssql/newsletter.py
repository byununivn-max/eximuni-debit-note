"""MSSQL newsletter + articles_newsletter 테이블 모델"""
from sqlalchemy import Column, Integer, String, Date, Text
from app.core.database import MSSQLBase


class MssqlNewsletter(MSSQLBase):
    """뉴스레터 테이블 (MSSQL UNI_DebitNote.dbo.newsletter)"""
    __tablename__ = "newsletter"
    __table_args__ = {"schema": "dbo"}

    id_newsletter = Column(Integer, primary_key=True, autoincrement=True)
    banner = Column(Text, nullable=True)
    content = Column(Text, nullable=True)
    note = Column(Text, nullable=True)
    language = Column(Text, nullable=True)
    name_newsletter = Column(Text, nullable=True)
    type = Column(Text, nullable=True)
    created = Column(Date, nullable=True)
    creator = Column(String(255), nullable=True)


class MssqlArticleNewsletter(MSSQLBase):
    """뉴스레터 기사 테이블 (MSSQL UNI_DebitNote.dbo.articles_newsletter)"""
    __tablename__ = "articles_newsletter"
    __table_args__ = {"schema": "dbo"}

    id_articles = Column(Integer, primary_key=True, autoincrement=True)
    id_newsletter = Column(Integer, nullable=True)
    title = Column(Text, nullable=True)
    link_img = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    link = Column(Text, nullable=True)
