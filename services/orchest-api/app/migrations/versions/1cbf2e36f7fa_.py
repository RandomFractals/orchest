"""Extend Job and NonInteractiveRun for scheduling

Revision ID: 1cbf2e36f7fa
Revises: 96f304f85ee5
Create Date: 2021-01-26 14:55:09.133729

"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "1cbf2e36f7fa"
down_revision = "96f304f85ee5"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "jobs",
        sa.Column(
            "created_time",
            sa.DateTime(),
            server_default=sa.text("timezone('utc', now())"),
            nullable=False,
        ),
    )
    op.add_column(
        "jobs",
        sa.Column(
            "job_name",
            sa.String(length=255),
            server_default=sa.text("'job'"),
            nullable=False,
        ),
    )
    op.add_column(
        "jobs",
        sa.Column(
            "next_scheduled_time", postgresql.TIMESTAMP(timezone=True), nullable=True
        ),
    )
    op.add_column(
        "jobs",
        sa.Column(
            "parameters",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default="[]",
            nullable=False,
        ),
    )
    op.add_column(
        "jobs",
        sa.Column(
            "pipeline_definition",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default="{}",
            nullable=False,
        ),
    )
    op.add_column(
        "jobs",
        sa.Column(
            "pipeline_name",
            sa.String(length=255),
            server_default=sa.text("''"),
            nullable=False,
        ),
    )
    op.add_column(
        "jobs",
        sa.Column(
            "pipeline_run_spec",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default="{}",
            nullable=False,
        ),
    )
    op.add_column("jobs", sa.Column("schedule", sa.String(length=100), nullable=True))
    op.add_column(
        "jobs",
        sa.Column(
            "status",
            sa.String(length=15),
            server_default=sa.text("'SUCCESS'"),
            nullable=False,
        ),
    )
    op.add_column(
        "jobs",
        sa.Column(
            "strategy_json",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default="{}",
            nullable=False,
        ),
    )
    op.add_column(
        "jobs",
        sa.Column(
            "total_scheduled_executions",
            sa.Integer(),
            server_default=sa.text("0"),
            nullable=True,
        ),
    )
    op.create_index(
        op.f("ix_jobs_created_time"), "jobs", ["created_time"], unique=False
    )
    op.create_index(
        op.f("ix_jobs_next_scheduled_time"),
        "jobs",
        ["next_scheduled_time"],
        unique=False,
    )
    op.drop_column("jobs", "scheduled_start")
    op.drop_column("jobs", "total_number_of_pipeline_runs")
    op.drop_column("jobs", "completed_pipeline_runs")
    op.add_column(
        "pipeline_runs",
        sa.Column(
            "job_run_index", sa.Integer(), server_default=sa.text("0"), nullable=False
        ),
    )
    op.add_column(
        "pipeline_runs",
        sa.Column("job_run_pipeline_run_index", sa.Integer(), nullable=True),
    )
    op.add_column(
        "pipeline_runs",
        sa.Column(
            "parameters",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default="{}",
            nullable=False,
        ),
    )
    op.add_column(
        "pipeline_runs", sa.Column("pipeline_run_index", sa.Integer(), nullable=True)
    )
    op.create_index(
        op.f("ix_pipeline_runs_job_uuid"), "pipeline_runs", ["job_uuid"], unique=False
    )
    op.create_unique_constraint(
        op.f("uq_pipeline_runs_job_uuid_job_run_index_job_run_pipeline_run_index"),
        "pipeline_runs",
        ["job_uuid", "job_run_index", "job_run_pipeline_run_index"],
    )
    op.create_unique_constraint(
        op.f("uq_pipeline_runs_job_uuid_pipeline_run_index"),
        "pipeline_runs",
        ["job_uuid", "pipeline_run_index"],
    )
    op.drop_column("pipeline_runs", "pipeline_run_id")


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column(
        "pipeline_runs",
        sa.Column("pipeline_run_id", sa.INTEGER(), autoincrement=False, nullable=True),
    )
    op.drop_constraint(
        op.f("uq_pipeline_runs_job_uuid_pipeline_run_index"),
        "pipeline_runs",
        type_="unique",
    )
    op.drop_constraint(
        op.f("uq_pipeline_runs_job_uuid_job_run_index_job_run_pipeline_run_index"),
        "pipeline_runs",
        type_="unique",
    )
    op.drop_index(op.f("ix_pipeline_runs_job_uuid"), table_name="pipeline_runs")
    op.drop_column("pipeline_runs", "pipeline_run_index")
    op.drop_column("pipeline_runs", "parameters")
    op.drop_column("pipeline_runs", "job_run_pipeline_run_index")
    op.drop_column("pipeline_runs", "job_run_index")
    op.add_column(
        "jobs",
        sa.Column(
            "completed_pipeline_runs",
            sa.INTEGER(),
            server_default=sa.text("0"),
            autoincrement=False,
            nullable=True,
        ),
    )
    op.add_column(
        "jobs",
        sa.Column(
            "total_number_of_pipeline_runs",
            sa.INTEGER(),
            autoincrement=False,
            nullable=False,
        ),
    )
    op.add_column(
        "jobs",
        sa.Column(
            "scheduled_start",
            postgresql.TIMESTAMP(),
            autoincrement=False,
            nullable=False,
        ),
    )
    op.drop_index(op.f("ix_jobs_next_scheduled_time"), table_name="jobs")
    op.drop_index(op.f("ix_jobs_created_time"), table_name="jobs")
    op.drop_column("jobs", "total_scheduled_executions")
    op.drop_column("jobs", "strategy_json")
    op.drop_column("jobs", "status")
    op.drop_column("jobs", "schedule")
    op.drop_column("jobs", "pipeline_run_spec")
    op.drop_column("jobs", "pipeline_name")
    op.drop_column("jobs", "pipeline_definition")
    op.drop_column("jobs", "parameters")
    op.drop_column("jobs", "next_scheduled_time")
    op.drop_column("jobs", "job_name")
    op.drop_column("jobs", "created_time")
    op.drop_constraint(
        op.f("uq_environment_build_build_uuid"), "environment_build", type_="unique"
    )
    # ### end Alembic commands ###