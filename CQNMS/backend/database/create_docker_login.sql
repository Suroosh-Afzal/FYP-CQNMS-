-- Creates the SQL login the Docker backend uses to reach SQL Server over TCP
-- (Windows Authentication only works for local, same-machine connections).
-- Run this AFTER enabling Mixed Mode Authentication and TCP/IP (see setup steps).

USE CQNMS_DB;
GO

CREATE LOGIN cqnms_app WITH PASSWORD = 'CHANGE_ME_STRONG_PASSWORD';
GO

CREATE USER cqnms_app FOR LOGIN cqnms_app;
GO

ALTER ROLE db_datareader ADD MEMBER cqnms_app;
ALTER ROLE db_datawriter ADD MEMBER cqnms_app;
GO
