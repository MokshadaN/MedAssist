from sqlalchemy.orm import Session
from models.report import Report
from typing import List

def save_report(db: Session, patient_id: str, file_url: str, parsed_data: str = None) -> Report:
    """
    Save a report record to the database.
    """
    db_report = Report(
        patient_id=patient_id,
        file_url=file_url,
        parsed_data=parsed_data
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    return db_report

def get_reports(db: Session, patient_id: str) -> List[Report]:
    """
    Get all reports for a specific patient.
    """
    return db.query(Report).filter(Report.patient_id == patient_id).all()


def delete_report(db: Session, report: Report) -> None:
    """
    Delete a report record from the database.
    """
    db.delete(report)
    db.commit()


def update_report_analysis(db: Session, report: Report, parsed_data: str | None) -> Report:
    """
    Update the stored analysis for a report.
    """
    report.parsed_data = parsed_data
    db.add(report)
    db.commit()
    db.refresh(report)
    return report
