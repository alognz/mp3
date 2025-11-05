// loading required packages
const mongoose = require('mongoose');

// defining our task schema
const TaskSchema = new mongoose.Schema({
    name: { type: String, required: [true, 'name required'] },
    description: { type: String, default: '' },
    deadline: { type: Date, required: [true, 'deadline required'] },
    completed: { type: Boolean, default: false },
    assignedUser: { type: String, default: "" },
    assignedUserName: { type: String, default: 'unassigned' },
    dateCreated: { type: Date, default: Date.now }
});

// exporting mongoose model
module.exports = mongoose.model('Task', TaskSchema);