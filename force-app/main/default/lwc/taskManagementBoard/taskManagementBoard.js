import { LightningElement, track, wire } from 'lwc';
import getTasks from '@salesforce/apex/TaskBoardController.getTasks';
import addTask from '@salesforce/apex/TaskBoardController.addTask';
import updateTask from '@salesforce/apex/TaskBoardController.updateTask';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class TaskManagementBoard extends LightningElement {
    @track projectFilter = 'All';
    @track statusFilter = 'All';
    @track assignedToFilter = '';
    @track startDate = '';
    @track endDate = '';

    @track projectOptions = [{ label: 'All', value: 'All' }];
    @track statusOptions = [{ label: 'All', value: 'All' }];
    @track assignedToOptions = [{ label: 'All', value: '' }];

    @track tasks = [];
    @track tasksByStatus = {};
    @track statusColumns = ['Not Started', 'In Progress', 'Completed'];

    @track isModalOpen = false;
    @track modalTitle = '';
    @track taskId = null;
    @track taskSubject = '';
    @track taskStatus = 'Not Started';
    @track taskOwnerId = '';
    @track taskActivityDate = '';

    dragTaskId = null;

    connectedCallback() {
        this.loadFilters();
        this.loadTasks();
    }

    loadFilters() {
        // For demo, static options. In real app, fetch from server or metadata.
        this.projectOptions = [
            { label: 'All', value: 'All' },
            { label: 'Project A', value: 'Project A' },
            { label: 'Project B', value: 'Project B' }
        ];
        this.statusOptions = [
            { label: 'All', value: 'All' },
            { label: 'Not Started', value: 'Not Started' },
            { label: 'In Progress', value: 'In Progress' },
            { label: 'Completed', value: 'Completed' }
        ];
        this.assignedToOptions = [
            { label: 'All', value: '' },
            { label: 'User 1', value: '0051x00000123AAA' },
            { label: 'User 2', value: '0051x00000123AAB' }
        ];
    }

    loadTasks() {
        getTasks({
            projectName: this.projectFilter,
            status: this.statusFilter,
            assignedToId: this.assignedToFilter || null,
            startDate: this.startDate || null,
            endDate: this.endDate || null
        })
        .then(result => {
            this.tasks = result.map(task => ({
                ...task,
                OwnerName: task.OwnerId // For demo, OwnerId used as name placeholder
            }));
            this.groupTasksByStatus();
        })
        .catch(error => {
            this.showToast('Error', error.body.message, 'error');
        });
    }

    groupTasksByStatus() {
        this.tasksByStatus = {};
        this.statusColumns.forEach(status => {
            this.tasksByStatus[status] = this.tasks.filter(task => task.Status === status);
        });
    }

    handleProjectChange(event) {
        this.projectFilter = event.detail.value;
        this.loadTasks();
    }

    handleStatusChange(event) {
        this.statusFilter = event.detail.value;
        this.loadTasks();
    }

    handleAssignedToChange(event) {
        this.assignedToFilter = event.detail.value;
        this.loadTasks();
    }

    handleStartDateChange(event) {
        this.startDate = event.target.value;
        this.loadTasks();
    }

    handleEndDateChange(event) {
        this.endDate = event.target.value;
        this.loadTasks();
    }

    handleAddTask() {
        this.modalTitle = 'Add Task';
        this.taskId = null;
        this.taskSubject = '';
        this.taskStatus = 'Not Started';
        this.taskOwnerId = '';
        this.taskActivityDate = '';
        this.isModalOpen = true;
    }

    handleEditTask(event) {
        const taskId = event.currentTarget.dataset.taskId;
        const task = this.tasks.find(t => t.Id === taskId);
        if (task) {
            this.modalTitle = 'Edit Task';
            this.taskId = task.Id;
            this.taskSubject = task.Subject;
            this.taskStatus = task.Status;
            this.taskOwnerId = task.OwnerId;
            this.taskActivityDate = task.ActivityDate;
            this.isModalOpen = true;
        }
    }

    handleSubjectChange(event) {
        this.taskSubject = event.target.value;
    }

    handleTaskStatusChange(event) {
        this.taskStatus = event.detail.value;
    }

    handleTaskOwnerChange(event) {
        this.taskOwnerId = event.detail.value;
    }

    handleTaskActivityDateChange(event) {
        this.taskActivityDate = event.target.value;
    }

    closeModal() {
        this.isModalOpen = false;
    }

    saveTask() {
        if (!this.taskSubject) {
            this.showToast('Error', 'Subject is required', 'error');
            return;
        }
        if (this.taskId) {
            updateTask({
                taskId: this.taskId,
                subject: this.taskSubject,
                status: this.taskStatus,
                ownerId: this.taskOwnerId,
                whatId: null,
                activityDate: this.taskActivityDate
            })
            .then(() => {
                this.showToast('Success', 'Task updated', 'success');
                this.isModalOpen = false;
                this.loadTasks();
            })
            .catch(error => {
                this.showToast('Error', error.body.message, 'error');
            });
        } else {
            addTask({
                subject: this.taskSubject,
                status: this.taskStatus,
                ownerId: this.taskOwnerId,
                whatId: null,
                activityDate: this.taskActivityDate
            })
            .then(() => {
                this.showToast('Success', 'Task added', 'success');
                this.isModalOpen = false;
                this.loadTasks();
            })
            .catch(error => {
                this.showToast('Error', error.body.message, 'error');
            });
        }
    }

    handleDragStart(event) {
        this.dragTaskId = event.currentTarget.dataset.taskId;
        event.dataTransfer.setData('text/plain', this.dragTaskId);
    }

    handleDragOver(event) {
        event.preventDefault();
    }

    handleDrop(event) {
        event.preventDefault();
        const status = event.currentTarget.dataset.status;
        const taskId = event.dataTransfer.getData('text/plain');
        const task = this.tasks.find(t => t.Id === taskId);
        if (task && task.Status !== status) {
            updateTask({
                taskId: task.Id,
                subject: task.Subject,
                status: status,
                ownerId: task.OwnerId,
                whatId: null,
                activityDate: task.ActivityDate
            })
            .then(() => {
                this.showToast('Success', 'Task status updated', 'success');
                this.loadTasks();
            })
            .catch(error => {
                this.showToast('Error', error.body.message, 'error');
            });
        }
    }

    showToast(title, message, variant) {
        this.dispatchEvent(
            new ShowToastEvent({
                title: title,
                message: message,
                variant: variant,
            }),
        );
    }
}
