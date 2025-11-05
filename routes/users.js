module.exports = function (router) {
    const User = require("../models/user");
    const Task = require("../models/task");

    const usersRoute = router.route("/users");
    const usersIdRoute = router.route("/users/:id");

    usersRoute.get(async function (req, res) {
        try {
            const query = User.find();

            const where = req.query.where ? JSON.parse(req.query.where) : undefined;
            const sort = req.query.sort ? JSON.parse(req.query.sort) : undefined;
            const select = req.query.select
                ? JSON.parse(req.query.select)
                : undefined;
            const skip = req.query.skip ? parseInt(req.query.skip) : undefined;
            const limit = req.query.limit ? parseInt(req.query.limit) : undefined;
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
                const total = await User.countDocuments(where || {});
                return res.status(200).json({ message: "OK", data: total });
            }

            const result = await query.exec();
            res.status(200).json({ message: "OK", data: result });
        } catch (err) {
            res.status(500).json({ message: "Server error", data: err.message });
        }
    });

    usersRoute.post(async function (req, res) {
        try {
            const { name, email } = req.body;
            if (!name || !email) {
                return res
                    .status(400)
                    .json({ message: "Name and email required", data: null });
            }

            const exists = await User.findOne({ email });
            if (exists) {
                return res
                    .status(400)
                    .json({ message: "Email already exists", data: null });
            }

            const newUser = new User(req.body);
            const err = newUser.validateSync();
            if (err) {
                return res
                    .status(400)
                    .json({ message: "Validation failed", data: err.message });
            }

            await newUser.save();
            res.status(201).json({ message: "User created", data: newUser });
        } catch (err) {
            res.status(500).json({ message: "Server error", data: err.message });
        }
    });

    usersIdRoute.get(async function (req, res) {
        try {
            const userId = req.params.id;
            const select = req.query.select
                ? JSON.parse(req.query.select)
                : undefined;

            let query = User.findById(userId);
            if (select) {
                query = query.select(select);
            }

            const user = await query.exec();
            if (!user) {
                return res.status(404).json({ message: "User not found", data: null });
            }

            res.status(200).json({ message: "OK", data: user });
        } catch (err) {
            res.status(500).json({ message: "Server error", data: err.message });
        }
    });

    usersIdRoute.put(async function (req, res) {
        try {
            const { name, email } = req.body;

            if (!name || !email) {
                return res
                    .status(400)
                    .json({ message: "Name and email required", data: null });
            }

            const user = await User.findByIdAndUpdate(req.params.id, req.body, {
                new: true,
            });

            if (!user) {
                return res.status(404).json({ message: "User not found", data: null });
            }

            res.status(200).json({ message: "User updated", data: user });
        } catch (err) {
            res.status(500).json({ message: "Server error", data: err.message });
        }
    });

    usersIdRoute.delete(async function (req, res) {
        try {
            const user = await User.findById(req.params.id);

            if (!user) {
                return res.status(404).json({ message: "User not found", data: null });
            }

            await Task.updateMany(
                { assignedUser: user._id.toString() },
                { $set: { assignedUser: "", assignedUserName: "unassigned" } }
            );

            await user.deleteOne();
            res.status(204).json({ message: "User deleted", data: null });
        } catch (err) {
            res.status(500).json({ message: "Server error", data: err.message });
        }
    });

    return router;
};
