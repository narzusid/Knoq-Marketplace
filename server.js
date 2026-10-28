const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');

const app = express();
app.use(express.json());
app.use(cors());

// Local MongoDB Connection
mongoose.connect('mongodb://localhost:27017/knoq_marketplace')
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch(err => console.log("DB Connection Error: ", err));

// Skill Schema & Model
const skillSchema = new mongoose.Schema({
    name: String,
    role: String,
    category: String,
    teach: String,
    learn: String,
    credits: String,
    rating: { type: String, default: '5.0' },
    reviews: { type: String, default: '0' },
    avatar: String,
    bio: String
});
const Skill = mongoose.model('Skill', skillSchema, 'skills');

// User Schema & Model (Default credits = 2 as per Time-Banking rule)
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    institution: String,
    bio: { type: String, default: 'Passionate learner and community member.' },
    credits: { type: Number, default: 2 }, 
    role: { type: String, default: 'user' } 
});
const User = mongoose.model('User', userSchema, 'users');

// Message Schema & Model
const messageSchema = new mongoose.Schema({
    sender: String,
    receiver: String,
    text: String,
    timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema, 'messages');

// Exchange Request Schema & Model
const requestSchema = new mongoose.Schema({
    sender: String,
    receiver: String,
    skillTitle: String,
    status: { type: String, default: 'Pending' }, 
    timestamp: { type: Date, default: Date.now }
});
const ExchangeRequest = mongoose.model('ExchangeRequest', requestSchema, 'exchange_requests');

// Notification Schema & Model
const notificationSchema = new mongoose.Schema({
    user: String,
    message: String,
    read: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now }
});
const Notification = mongoose.model('Notification', notificationSchema, 'notifications');

// Review Schema & Model
const reviewSchema = new mongoose.Schema({
    skillId: String,
    reviewer: String,
    instructor: String,
    rating: Number,
    comment: String,
    timestamp: { type: Date, default: Date.now }
});
const Review = mongoose.model('Review', reviewSchema, 'reviews');

// --- API ROUTES ---

app.get('/api/skills', async (req, res) => {
    try {
        const skills = await Skill.find({});
        res.json(skills);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch skills' });
    }
});

app.post('/api/skills', async (req, res) => {
    try {
        const newSkill = new Skill(req.body);
        await newSkill.save();
        res.status(201).json({ message: 'Skill listed successfully!', skill: newSkill });
    } catch (err) {
        res.status(500).json({ error: 'Failed to add skill' });
    }
});

app.delete('/api/skills/:id', async (req, res) => {
    try {
        await Skill.findByIdAndDelete(req.params.id);
        res.json({ message: 'Skill deleted by admin successfully!' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete skill' });
    }
});

// Signup (Default credits set to 2)
app.post('/api/signup', async (req, res) => {
    try {
        const { name, email, password, institution } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Account already exists with this email!' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ 
            name, 
            email, 
            password: hashedPassword, 
            institution, 
            credits: 2, 
            role: 'user'
        });
        await newUser.save();
        res.status(201).json({ message: 'Account created successfully with 2 free credits!', user: newUser });
    } catch (err) {
        res.status(500).json({ error: 'Server error during signup' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: 'Invalid email or password!' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid email or password!' });
        }

        res.json({ message: 'Login successful!', user });
    } catch (err) {
        res.status(500).json({ error: 'Server error during login' });
    }
});

app.put('/api/user/update', async (req, res) => {
    try {
        const { email, name, institution, bio } = req.body;
        const updatedUser = await User.findOneAndUpdate(
            { email },
            { name, institution, bio },
            { new: true }
        );
        if (!updatedUser) return res.status(404).json({ error: 'User not found!' });
        res.json({ message: 'Profile updated successfully!', user: updatedUser });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

app.get('/api/admin/users', async (req, res) => {
    try {
        const users = await User.find({});
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

app.delete('/api/admin/users/:id', async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User removed by admin successfully!' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

app.get('/api/messages', async (req, res) => {
    try {
        const messages = await Message.find({});
        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

app.post('/api/messages', async (req, res) => {
    try {
        const newMessage = new Message(req.body);
        await newMessage.save();

        await Notification.create({
            user: req.body.receiver,
            message: `New message from ${req.body.sender}`
        });

        res.status(201).json({ message: 'Message sent successfully!', data: newMessage });
    } catch (err) {
        res.status(500).json({ error: 'Failed to send message' });
    }
});

app.get('/api/requests', async (req, res) => {
    try {
        const requests = await ExchangeRequest.find({});
        res.json(requests);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch requests' });
    }
});

app.post('/api/requests', async (req, res) => {
    try {
        const newRequest = new ExchangeRequest(req.body);
        await newRequest.save();

        await Notification.create({
            user: req.body.receiver,
            message: `${req.body.sender} sent an exchange request for "${req.body.skillTitle}"`
        });

        res.status(201).json({ message: 'Exchange request sent successfully!', data: newRequest });
    } catch (err) {
        res.status(500).json({ error: 'Failed to send exchange request' });
    }
});

// Update Request Status (1 Credit = 1 Hour Session Transfer)
app.put('/api/requests/update', async (req, res) => {
    try {
        const { requestId, status } = req.body;
        const request = await ExchangeRequest.findById(requestId);
        if (!request) return res.status(404).json({ error: 'Request not found' });

        request.status = status;
        await request.save();

        if (status === 'Accepted' || status === 'Completed') {
            await User.findOneAndUpdate({ name: request.sender }, { $inc: { credits: -1 } });
            await User.findOneAndUpdate({ name: request.receiver }, { $inc: { credits: 1 } });
        }

        await Notification.create({
            user: request.sender,
            message: `Your exchange request to ${request.receiver} was updated to ${status}`
        });

        res.json({ message: `Request status updated to ${status}! 1 Credit transferred.`, request });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update request status' });
    }
});

app.get('/api/notifications/:username', async (req, res) => {
    try {
        const notifs = await Notification.find({ user: req.params.username }).sort({ timestamp: -1 });
        res.json(notifs);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

app.post('/api/reviews', async (req, res) => {
    try {
        const newReview = new Review(req.body);
        await newReview.save();

        const allReviews = await Review.find({ instructor: req.body.instructor });
        const avgRating = (allReviews.reduce((acc, r) => acc + r.rating, 0) / allReviews.length).toFixed(1);
        
        await Skill.updateMany(
            { name: req.body.instructor },
            { rating: avgRating, reviews: allReviews.length.toString() }
        );

        res.status(201).json({ message: 'Review submitted successfully!', review: newReview });
    } catch (err) {
        res.status(500).json({ error: 'Failed to submit review' });
    }
});

app.listen(5000, () => {
    console.log("🚀 Server running on port 5000");
});