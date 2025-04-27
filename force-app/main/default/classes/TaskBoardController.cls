public with sharing class TaskBoardController {
    @AuraEnabled(cacheable=true)
    public static List<Task> getTasks(String projectName, String status, Id assignedToId, Date startDate, Date endDate) {
        String baseQuery = 'SELECT Id, Subject, Status, OwnerId, ActivityDate, What.Name, WhatId FROM Task WHERE IsClosed = false';
        List<String> filters = new List<String>();

        if (projectName != null && projectName != 'All') {
            filters.add('What.Name = :projectName');
        }
        if (status != null && status != 'All') {
            filters.add('Status = :status');
        }
        if (assignedToId != null) {
            filters.add('OwnerId = :assignedToId');
        }
        if (startDate != null) {
            filters.add('ActivityDate >= :startDate');
        }
        if (endDate != null) {
            filters.add('ActivityDate <= :endDate');
        }

        if (!filters.isEmpty()) {
            baseQuery += ' AND ' + String.join(filters, ' AND ');
        }

        baseQuery += ' ORDER BY ActivityDate ASC NULLS LAST';

        return Database.query(baseQuery);
    }

    @AuraEnabled
    public static Task addTask(String subject, String status, Id ownerId, Id whatId, Date activityDate) {
        Task newTask = new Task();
        newTask.Subject = subject;
        newTask.Status = status;
        newTask.OwnerId = ownerId;
        newTask.WhatId = whatId;
        newTask.ActivityDate = activityDate;
        insert newTask;
        return newTask;
    }

    @AuraEnabled
    public static Task updateTask(Id taskId, String subject, String status, Id ownerId, Id whatId, Date activityDate) {
        Task taskToUpdate = [SELECT Id FROM Task WHERE Id = :taskId LIMIT 1];
        taskToUpdate.Subject = subject;
        taskToUpdate.Status = status;
        taskToUpdate.OwnerId = ownerId;
        taskToUpdate.WhatId = whatId;
        taskToUpdate.ActivityDate = activityDate;
        update taskToUpdate;
        return taskToUpdate;
    }
}
