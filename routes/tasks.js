module.exports = function (router) {
    const Task = require("../models/task");
    const User = require("../models/user");

    const tasksRoute = router.route("/tasks");
    const tasksIdRoute = router.route("/tasks/:id");

    tasksRoute.get(async function (req, res) {
        try {
            const query = Task.find();

            const where = req.query.where ? JSON.parse(req.query.where) : undefined;
            const sort = req.query.sort ? JSON.parse(req.query.sort) : undefined;
            const select = req.query.select
                ? JSON.parse(req.query.select)
                : undefined;
            const skip = req.query.skip ? parseInt(req.query.skip) : undefined;
            const limit = req.query.limit ? parseInt(req.query.limit) : 100;
            const count = req.query.count === "true";

            if (where) {
                query.where(where);
            }
            if (sort) {
                query.sort(sort);
            }
            if (select) {
                query.select(select);
            }
            if (skip) {
                query.skip(skip);
            }
            if (limit) {
                query.limit(limit);
            }

            if (count) {
                const total = await Task.countDocuments(where || {});
                return res.status(200).json({ message: "OK", data: total });
            }

            const result = await query.exec();
            res.status(200).json({ message: "OK", data: result });
        } catch (err) {
            res.status(500).json({ message: "Server error", data: err.message });
        }
    });

    tasksRoute.post(async function (req, res) {
        try {
            const { name, deadline, assignedUser } = req.body;

            if (!name || !deadline) {
                return res
                    .status(400)
                    .json({ message: "Name and deadline required", data: null });
            }

            let assignedUserName = "unassigned";
            if (assignedUser) {
                const user = await User.findById(assignedUser);
                if (!user) {
                    return res
                        .status(400)
                        .json({ message: "Assigned user not found", data: null });
                }
                assignedUserName = user.name;
            }

            const newTask = new Task({
                name: name,
                description: req.body.description || "",
                deadline: Number(deadline),
                completed: req.body.completed || false,
                assignedUser: assignedUser || "",
                assignedUserName: assignedUserName,
            });

            const err = newTask.validateSync();
            if (err) {
                return res
                    .status(400)
                    .json({ message: "Validation failed", data: err.message });
            }

            await newTask.save();

            if (assignedUser) {
                await User.findByIdAndUpdate(assignedUser, {
                    $addToSet: { pendingTasks: newTask._id.toString() },
                });
            }

            res.status(201).json({ message: "Task created", data: newTask });
        } catch (err) {
            res.status(500).json({ message: "Server error", data: err.message });
        }
    });

    tasksIdRoute.get(async function (req, res) {
        try {
            const taskId = req.params.id;
            const select = req.query.select
                ? JSON.parse(req.query.select)
                : undefined;

            let query = Task.findById(taskId);
            if (select) {
                query = query.select(select);
            }

            const task = await query.exec();
            if (!task) {
                return res.status(404).json({ message: "Task not found", data: null });
            }

            res.status(200).json({ message: "OK", data: task });
        } catch (err) {
            res.status(500).json({ message: "Server error", data: err.message });
        }
    });

    tasksIdRoute.put(async function (req, res) {
        try {
            const { name, deadline, assignedUser } = req.body;

            if (!name || !deadline) {
                return res
                    .status(400)
                    .json({ message: "Name and deadline required", data: null });
            }

            const oldTask = await Task.findById(req.params.id);
            if (!oldTask) {
                return res.status(404).json({ message: "Task not found", data: null });
            }

            const previousUserId = oldTask.assignedUser;
            let newAssignedUserName = "unassigned";

            if (assignedUser) {
                const user = await User.findById(assignedUser);
                if (!user) {
                    return res
                        .status(400)
                        .json({ message: "Assigned user not found", data: null });
                }
                newAssignedUserName = user.name;
            }

            const updatedTask = await Task.findByIdAndUpdate(
                req.params.id,
                {
                    ...req.body,
                    assignedUserName: newAssignedUserName,
                },
                { new: true }
            );

            if (previousUserId && previousUserId !== assignedUser) {
                await User.findByIdAndUpdate(previousUserId, {
                    $pull: { pendingTasks: updatedTask._id.toString() },
                });
            }

            if (assignedUser) {
                await User.findByIdAndUpdate(assignedUser, {
                    $addToSet: { pendingTasks: updatedTask._id.toString() },
                });
            }

            res.status(200).json({ message: "Task updated", data: updatedTask });
        } catch (err) {
            res.status(500).json({ message: "Server error", data: err.message });
        }
    });

    tasksIdRoute.delete(async function (req, res) {
        try {
            const task = await Task.findById(req.params.id);
            if (!task)
                return res.status(404).json({ message: "Task not found", data: null });

            if (task.assignedUser) {
                await User.findByIdAndUpdate(task.assignedUser, {
                    $pull: { pendingTasks: task._id.toString() },
                });
            }

            await task.deleteOne();
            res.status(204).json({ message: "Task deleted", data: null });
        } catch (err) {
            res.status(500).json({ message: "Server error", data: err.message });
        }
    });

    return router;
};
