const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');

const app = express();

/* ================== UPLOAD FOLDER ================== */
const uploadPath = path.join(__dirname, 'pages/uploads');
if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
}

/* ================== MULTER ================== */
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadPath),
    filename: (req, file, cb) =>
        cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

/* ================== STATIC ================== */
app.use('/uploads', express.static(uploadPath));
app.use('/css', express.static(path.join(__dirname, 'access/css')));
app.use('/access', express.static(path.join(__dirname, 'access')));


/* ================== MONGODB ================== */
let mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dynosite';
if (fs.existsSync(path.join(__dirname, '.env'))) {
    try {
        const envText = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
        const match = envText.match(/^\s*MONGODB_URI\s*=\s*([^\r\n]+)/m);
        if (match && match[1]) mongoUri = match[1].trim();
    } catch {}
}

mongoose.connect(mongoUri)
    .then(() => console.log('MongoDB Connected successfully to:', mongoUri.includes('@') ? 'MongoDB Atlas (Online)' : mongoUri))
    .catch(err => {
        console.error('Primary MongoDB connection failed:', err.message);
        if (mongoUri !== 'mongodb://localhost:27017/dynosite') {
            console.log('Attempting local fallback (mongodb://localhost:27017/dynosite)...');
            mongoose.connect('mongodb://localhost:27017/dynosite')
                .then(() => console.log('MongoDB Connected to local fallback'))
                .catch(e => console.error('Local fallback failed:', e.message));
        }
    });

/* ================== SCHEMA ================== */
const pageSchema = new mongoose.Schema({
    navigation_title: String,
    pages: Object
});
const PageHeader = mongoose.model('PageHeader', pageSchema);

const adminFields = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
const Admin = mongoose.model('Admin', adminFields);

const userFields = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    pincode: { type: String, default: '' }
}, { timestamps: true });
const User = mongoose.model('User', userFields);

// Order Schema for E-Commerce Workflow
const orderSchema = new mongoose.Schema({
    orderId: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: { type: String, required: true },
    userEmail: { type: String, required: true },
    phone: { type: String, default: '' },
    shippingAddress: {
        address: { type: String, default: '' },
        city: { type: String, default: '' },
        state: { type: String, default: '' },
        pincode: { type: String, default: '' }
    },
    items: [
        {
            productId: String,
            name: String,
            price: Number,
            quantity: { type: Number, default: 1 },
            image: String
        }
    ],
    totalAmount: { type: Number, required: true },
    paymentMethod: { type: String, default: 'Cash on Delivery (COD)' },
    status: {
        type: String,
        enum: ['Pending', 'Accepted', 'Out for Delivery', 'Delivered', 'Cancelled'],
        default: 'Pending'
    }
}, { timestamps: true });
const Order = mongoose.model('Order', orderSchema);

// Helper to identify currently authenticated user
function getAuthUser(req) {
    let email = req.headers['x-user-email'] || req.query.userEmail || req.body?.userEmail;
    if (!email && req.headers.cookie) {
        const match = req.headers.cookie.match(/userEmail=([^;]+)/);
        if (match) email = decodeURIComponent(match[1]);
    }
    return email ? email.trim().toLowerCase() : null;
}    

//product
const productSchema = new mongoose.Schema({
    image: { type: String, required: true },
    name: { type: String, required: true },

    ribbon: { type: String },

    category: { type: [String], required: true },
    subCategory: { type: [String], required: true },
    description: { type: String, required: true },

    oldPrice: { type: Number, required: true },
    price: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    delivery: { type: String, default: 'Free delivery • 2-3 days' },
    deliveryCharge: { type: String, default: '0' },
    stock: { type: String, default: 'in' },
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);

//category
const categorySchema = new mongoose.Schema({
    categoryImage: { type: String, required: true },
    category: {
        type: String,
        required: true,
        trim: true
    },
    subCategories: {
        type: [String],   // STORED AS ARRAY
        required: true
    }
});
const Category = mongoose.model('Category', categorySchema);

//rippon
const ripponSchema = new mongoose.Schema({
    ribbons: {
        type: [String],
        required: true
    }
}, { timestamps: true });
const Rippon = mongoose.model('Rippon', ripponSchema);

const DeletedFieldSchema = new mongoose.Schema({
  path: { type: String, required: true },
  value: mongoose.Schema.Types.Mixed,
  type: { type: String, enum: ['text','image'], required: true },
  deletedAt: { type: Date, default: Date.now }
});

const DeletedField = mongoose.model('DeletedField', DeletedFieldSchema);


/* ================== BODY PARSERS ================== */
app.use(express.urlencoded({ extended: true }));
app.use(express.json());


/* ================== ADD ROUTE (UNCHANGED) ================== */
app.post(
    '/add',
    upload.fields([
        { name: 'page1img1' }, { name: 'page1img2' }, { name: 'page1img3' }, { name: 'page1img4' },
        { name: 'page1sec1_file' },
        { name: 'feature1img' },{ name: 'feature2img' },{ name: 'feature3img' },{ name: 'feature4img' },

        { name: 'page2img1' },
        { name: 'page2sec1_file' },
        { name: 'page2vision_file' },

        { name: 'page2sec2_icon1' },
        { name: 'page2sec2_icon2' },
        { name: 'page2sec2_icon3' },

        { name: 'page2sec3_file' },

        { name: 'page3img1' },
        { name: 'deliveryimg' },
        { name: 'page4img1' }
        
    ]),
    async (req, res) => {
        try {
            const data = new PageHeader({
                navigation_title: req.body.navigation_title,

                pages: {
                    page1: {
                        title: req.body.page_1,
                        images: [
                            {
                                file: req.files.page1img1?.[0]?.filename,
                                heading: req.body.page1img1_headings,
                                detail: req.body.page1img1_details,
                                button: req.body.page1img1_button
                            },
                            {
                                file: req.files.page1img2?.[0]?.filename,
                                heading: req.body.page1img2_headings,
                                detail: req.body.page1img2_details,
                                button: req.body.page1img2_button
                            },
                            {
                                file: req.files.page1img3?.[0]?.filename,
                                heading: req.body.page1img3_headings,
                                detail: req.body.page1img3_details,
                                button: req.body.page1img3_button
                            },
                            {
                                file: req.files.page1img4?.[0]?.filename,
                                heading: req.body.page1img4_headings,
                                detail: req.body.page1img4_details,
                                button: req.body.page1img4_button
                            }
                        ],
                        sections: [
                            {
                                name: req.body.page1sec1_name,
                                details: req.body.page1sec1_details,
                                file: req.files.page1sec1_file?.[0]?.filename,
                                button: req.body.page1sec1_button
                            },
                            {
                                ribbonPrimary: req.body.ribbonPrimary,
                                ribbonSecondary: req.body.ribbonSecondary
                            }
                        ],
                        categories: [
                            req.body.category1,
                            req.body.category2,
                            req.body.category3,
                            req.body.category4,
                            req.body.category5,
                            req.body.category6,
                            req.body.category7,
                            req.body.category8
                        ].filter(c => c && c.trim() !== ""),
                        specialities: [
                            {
                                image: req.files.feature1img?.[0]?.filename,
                                title: req.body.feature1title,
                                subtitle: req.body.feature1subtitle
                            },
                            {
                                image: req.files.feature2img?.[0]?.filename,
                                title: req.body.feature2title,
                                subtitle: req.body.feature2subtitle
                            },
                            {
                                image: req.files.feature3img?.[0]?.filename,
                                title: req.body.feature3title,
                                subtitle: req.body.feature3subtitle
                            },
                            {
                                image: req.files.feature4img?.[0]?.filename,
                                title: req.body.feature4title,
                                subtitle: req.body.feature4subtitle
                            }
                        ]
                    },
                    page2: {
                        title: req.body.page_2,
                        header: {
                            image: req.files.page2img1?.[0]?.filename,
                            heading: req.body.page2img1_headings,
                            detail: req.body.page2img1_details
                        },

                        about: {
                            name: req.body.page2sec1_name,
                            subtitle: req.body.page2sec1_subtitle,
                            image: req.files.page2sec1_file?.[0]?.filename,
                            heading: req.body.page2sec1_heading,
                            details: req.body.page2sec1_details
                        },

                        core: {
                            name: req.body.page2sec2_name,
                            subtitle: req.body.page2sec2_subtitle,
                            cards: [
                                {
                                    icon: req.files.page2sec2_icon1?.[0]?.filename,
                                    heading: req.body.page2sec2_heading1,
                                    details: req.body.page2sec2_details1
                                },
                                {
                                    icon: req.files.page2sec2_icon2?.[0]?.filename,
                                    heading: req.body.page2sec2_heading2,
                                    details: req.body.page2sec2_details2
                                },
                                {
                                    icon: req.files.page2sec2_icon3?.[0]?.filename,
                                    heading: req.body.page2sec2_heading3,
                                    details: req.body.page2sec2_details3
                                }
                            ]
                        },
                        mission: {
                            title: req.body.missiontitle,
                            subtitle: req.body.missionsubtitle,
                            description: req.body.missiondescription,
                            points: [
                                { title: req.body.mission1, description: req.body.mission1description },
                                { title: req.body.mission2, description: req.body.mission2description },
                                { title: req.body.mission3, description: req.body.mission3description },
                                { title: req.body.mission4, description: req.body.mission4description }
                            ].filter(p => (p.title && p.title.trim()) || (p.description && p.description.trim()))
                        },
                        vision: {
                            name: req.body.page2vision_name || req.body.visiontitle,
                            subtitle: req.body.page2vision_subtitle || '',
                            details: req.body.page2vision_details || req.body.visiondescription,
                            points: [
                                { title: req.body.vision1, description: req.body.vision1description },
                                { title: req.body.vision2, description: req.body.vision2description },
                                { title: req.body.vision3, description: req.body.vision3description },
                                { title: req.body.vision4, description: req.body.vision4description },
                                { title: req.body.page2vision_point1 },
                                { title: req.body.page2vision_point2 },
                                { title: req.body.page2vision_point3 },
                                { title: req.body.page2vision_point4 },
                                { title: req.body.page2vision_point5 }
                            ].filter(p => (p.title && p.title.trim()) || (p.description && p.description.trim())),
                            image: req.files.page2vision_file?.[0]?.filename
                        },

                        why_us: {
                            name: req.body.page2sec3_name,
                            subtitle: req.body.page2sec3_subtitle,
                            features: [
                                req.body.page2sec3_feature1,
                                req.body.page2sec3_feature2,
                                req.body.page2sec3_feature3,
                                req.body.page2sec3_feature4,
                                req.body.page2sec3_feature5
                            ],
                            image: req.files.page2sec3_file?.[0]?.filename
                        },
                        feedbacks: [
                            {
                                name: req.body.feedback1name,
                                sub: req.body.feedback1sub,
                                message: req.body.feedback1message
                            },
                            {
                                name: req.body.feedback2name,
                                sub: req.body.feedback2sub,
                                message: req.body.feedback2message
                            },
                            {
                                name: req.body.feedback3name,
                                sub: req.body.feedback3sub,
                                message: req.body.feedback3message
                            },
                            {
                                name: req.body.feedback4name,
                                sub: req.body.feedback4sub,
                                message: req.body.feedback4message
                            }
                        ].filter(f => (f?.name && f.name.trim()) || (f?.sub && f.sub.trim()) || (f?.message && f.message.trim())),
                        
                    },

                    page3: {
                        title: req.body.page_3,
                        image: req.files.page3img1?.[0]?.filename,
                        heading: req.body.page3img1_headings,
                        detail: req.body.page3img1_details,
                        imagedelivery: req.files.deliveryimg?.[0]?.filename,
                        points: [
                            req.body.points1,
                            req.body.points2,
                            req.body.points3,
                            req.body.points4,
                            req.body.points5
                        ]
                    },

                    page4: {
                        title: req.body.page_4,
                        image: req.files.page4img1?.[0]?.filename,
                        heading: req.body.page4img1_headings,
                        detail: req.body.page4img1_details,
                        contact: {
                            dnumber: req.body['footer.dnumber'] || req.body.dnumber,
                            streetname: req.body['footer.streetname'] || req.body.streetname,
                            city: req.body['footer.city'] || req.body.city,
                            district: req.body['footer.district'] || req.body.district,
                            state: req.body['footer.state'] || req.body.state,
                            zipcode: req.body['footer.zipcode'] || req.body.zipcode,
                            primaryphone: req.body['footer.primaryphone'] || req.body.primaryphone || req.body['footer.phone'],
                            secondaryphone: req.body['footer.secondaryphone'] || req.body.secondaryphone,
                            supportemail: req.body['footer.email'] || req.body.supportemail || req.body.email,
                            workinghours: req.body['footer.hours'] || req.body.workinghours || req.body.hours,
                            mapUrl: req.body['footer.mapUrl'] || req.body.mapUrl
                        }
                    },
                    
                    footer: {
                        brand: req.body['footer.brand'],
                        tagline: req.body['footer.tagline'],
                        description: req.body['footer.description'],
                        social: {
                            facebook: req.body['footer.facebook'],
                            instagram: req.body['footer.instagram'],
                            twitter: req.body['footer.twitter'],
                            youtube: req.body['footer.youtube']
                        },
                        quickLinks: [
                            req.body.page_1,
                            req.body.page_2,
                            req.body.page_3,
                            req.body.page_4
                        ].filter(Boolean),
                        categories: [
                            req.body.category1,
                            req.body.category2,
                            req.body.category3,
                            req.body.category4,
                            req.body.category5,
                            req.body.category6,
                            req.body.category7,
                            req.body.category8
                        ].filter(c => c && c.trim() !== ""),
                        contact: {
                            address: req.body['footer.address'],
                            phone: req.body['footer.phone'],
                            email: req.body['footer.email'],
                            hours: req.body['footer.hours']
                        }
                    }
                }
            });

            await data.save();
            res.send('Data stored successfully ✅');

        } catch (err) {
            console.error(err);
            res.status(500).send(`<script>
                alert('Upload failed: ${String(err.message || err)}');
                window.location.href='/add';
            </script>`);
        }
    }
);


/* ================== REGISTER (UNIFIED FOR USER & ADMIN) ================== */
app.post('/register', upload.none(), async (req, res) => {
    try {
        let { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.send(`<script>
                alert('All fields are required');
                window.location.href='/register';
            </script>`);
        }

        const trimmedEmail = email.trim().toLowerCase();
        const trimmedUsername = username.trim();
        const isAdmin = trimmedEmail.includes('.admin@') || trimmedEmail.includes('.admin');

        const hashedPassword = await bcrypt.hash(password, 10);

        if (isAdmin) {
            const existingAdmin = await Admin.findOne({ email: new RegExp('^' + trimmedEmail + '$', 'i') });
            if (existingAdmin) {
                return res.send(`<script>
                    alert('Admin email already exists. Please login.');
                    window.location.href='/login';
                </script>`);
            }

            const newAdmin = new Admin({
                username: trimmedUsername,
                email: trimmedEmail,
                password: hashedPassword
            });
            await newAdmin.save();

            return res.send(`<script>
                alert('Admin account created successfully! Please login to access your admin panel.');
                window.location.href='/login';
            </script>`);
        } else {
            const existingUser = await User.findOne({ email: new RegExp('^' + trimmedEmail + '$', 'i') });
            if (existingUser) {
                return res.send(`<script>
                    alert('User email already exists. Please login.');
                    window.location.href='/login';
                </script>`);
            }

            const newUser = new User({
                username: trimmedUsername,
                email: trimmedEmail,
                password: hashedPassword
            });
            await newUser.save();

            return res.send(`<script>
                alert('User registered successfully! Please login.');
                window.location.href='/login';
            </script>`);
        }
    } catch (err) {
        console.error('Register error:', err.message);
        res.send(`<script>
            alert('${err.message}');
            window.location.href='/register';
        </script>`);
    }
});

/* ================== LOGIN (UNIFIED FOR USER & ADMIN) ================== */
app.post('/login', async (req, res) => {
    try {
        let { email, password } = req.body;
        if (!email || !password) {
            return res.send(`<script>
                alert('Please enter both email and password');
                window.location.href='/login';
            </script>`);
        }

        const trimmedEmail = email.trim().toLowerCase();
        const isAdmin = trimmedEmail.includes('.admin@') || trimmedEmail.includes('.admin');

        if (isAdmin) {
            const admin = await Admin.findOne({ email: new RegExp('^' + trimmedEmail + '$', 'i') });
            if (!admin) {
                return res.send(`<script>
                    alert('Admin account not found. Please register your .admin account first.');
                    window.location.href='/register';
                </script>`);
            }

            const isMatch = await bcrypt.compare(password, admin.password);
            if (!isMatch) {
                return res.send(`<script>
                    alert('Invalid admin password');
                    window.location.href='/login';
                </script>`);
            }

            res.setHeader('Set-Cookie', [
                `userEmail=${encodeURIComponent(admin.email)}; Path=/; Max-Age=2592000`,
                `userRole=admin; Path=/; Max-Age=2592000`,
                `userName=${encodeURIComponent(admin.username)}; Path=/; Max-Age=2592000`
            ]);

            return res.send(`<script>
                localStorage.setItem('currentUser', JSON.stringify({ id: '${admin._id}', username: '${admin.username.replace(/'/g, "\\'")}', email: '${admin.email}', role: 'admin' }));
                alert('Welcome Admin! Redirecting to Admin Control Hub...');
                window.location.href='/controls';
            </script>`);
        } else {
            const user = await User.findOne({ email: new RegExp('^' + trimmedEmail + '$', 'i') });
            if (!user) {
                return res.send(`<script>
                    alert('User account not found. Please register first.');
                    window.location.href='/register';
                </script>`);
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.send(`<script>
                    alert('Invalid password');
                    window.location.href='/login';
                </script>`);
            }

            res.setHeader('Set-Cookie', [
                `userEmail=${encodeURIComponent(user.email)}; Path=/; Max-Age=2592000`,
                `userRole=user; Path=/; Max-Age=2592000`,
                `userName=${encodeURIComponent(user.username)}; Path=/; Max-Age=2592000`
            ]);

            return res.send(`<script>
                localStorage.setItem('currentUser', JSON.stringify({ id: '${user._id}', username: '${user.username.replace(/'/g, "\\'")}', email: '${user.email}', role: 'user' }));
                alert('Login successful! Redirecting to store...');
                window.location.href='/home';
            </script>`);
        }
    } catch (err) {
        console.error('Login error:', err.message);
        res.send(`<script>
            alert('${err.message}');
            window.location.href='/login';
        </script>`);
    }
});

app.post('/category',upload.single('categoryImage'), async (req, res) => {
    try {
        const { category, subcategory, categoryImage } = req.body;

        if (!category || !subcategory) {
            return res.send(`<script>
                alert('Category and sub-categories are required');
                window.location.href='/controls';
            </script>`);
        }

        // ALWAYS convert to array
        const subCategoryArray = Array.isArray(subcategory)
            ? subcategory
            : [subcategory];

        // Add categoryImage to the newCategory object
        const newCategory = new Category({
            categoryImage: req.file.path, // Store the path of the uploaded image
            category: category,
            subCategories: subCategoryArray
        });

        await newCategory.save();

        res.send(`<script>
            alert('Category stored successfully ✅');
            window.location.href='/controls';
        </script>`);

    } catch (error) {
        console.error(error);
        res.send(`<script>
            alert('Server Error ❌');
            window.location.href='/controls';
        </script>`);
    }
});

app.post('/rippon', upload.none(), async (req, res) => {
    try {
        let { ribbon } = req.body;

        // Ensure ribbon is always an array
        if (!ribbon) {
            return res.send(`<script>
                alert('Ribbon is required');
                window.location.href='/controls';
            </script>`);
        }

        if (!Array.isArray(ribbon)) {
            ribbon = [ribbon]; // when only one input exists
        }

        const newRippon = new Rippon({
            ribbons: ribbon
        });

        await newRippon.save();

        res.send(`<script>
            alert('Ribbon stored successfully ✅');
            window.location.href='/controls';
        </script>`);

    } catch (error) {
        console.error(error);
        res.send(`<script>
            alert('Server error ❌');
            window.location.href='/controls';
        </script>`);
    }
});

//productadd
app.post('/add-product', upload.single('image'), async (req, res) => {
    try {
        const {
            name,
            ribbon,
            category,
            subCategory,
            description,
            oldPrice,
            price,
            discount,
            delivery,
            deliveryCharge,
            stock
        } = req.body;

        // Ensure category is an array
        const categoryArray = category 
            ? (Array.isArray(category) ? category : [category]) 
            : [];

        // Ensure subCategory is an array
        const subCategoryArray = subCategory 
            ? (Array.isArray(subCategory) ? subCategory : [subCategory]) 
            : [];

        const product = new Product({
            image: req.file.filename,
            name,
            ribbon,
            category: categoryArray,
            subCategory: subCategoryArray,
            description,
            oldPrice,
            price,
            discount,
            delivery,
            deliveryCharge,
            stock
        });

        await product.save();

        res.send(`<script>
            alert('Product added successfully ✅');
            window.location.href='/controls';
        </script>`);
    } catch (err) {
        console.error(err);
        res.send(`<script>
            alert('Product upload failed ❌');
            window.location.href='/prod';
        </script>`);
    }
});

// GET all products
app.get('/products', async (req, res) => {
    try {
        const products = await Product.find().sort({ createdAt: -1 });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});

//fetch
//rippon
app.get('/api/ribbons', async (req, res) => {
    try {
        const data = await Rippon.find().sort({ createdAt: -1 });
        const ribbons = data.flatMap(r => r.ribbons);
        res.json(ribbons);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch ribbons' });
    }
});

//category
app.get('/api/categories', async (req, res) => {
    try {
        const categories = await Category.find({}, 'category subCategories categoryImage');
        res.json(categories);
    } catch {
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

//subcategory
app.get('/api/categories/:category', async (req, res) => {
    try {
        const category = await Category.findOne({ category: req.params.category });
        if (!category) return res.json([]);
        res.json(category.subCategories);
    } catch {
        res.status(500).json({ error: 'Failed to fetch sub-categories' });
    }
});

//read category content
app.get('/categories-view', async (req, res) => {
    try {
        const categories = await Category.find();
        // Ensure we send only the filename, handling legacy full paths
        const data = categories.map(cat => {
            let image = cat.categoryImage;
            if (image) {
                // Split by both / and \ and take the last part
                image = image.split(/[\/\\]/).pop();
            }
            return {
                category: cat.category,
                categoryImage: image
            };
        });
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// GET trending products (max 6)
app.get('/api/products/trending', async (req, res) => {
    try {
        // Find products where ribbon contains 'trending' (case insensitive)
        const products = await Product.find({ ribbon: { $regex: /trending/i } })
            .sort({ createdAt: -1 })
            .limit(6);

        res.json(products);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch trending products' });
    }
});

// GET new arrival products (max 6)
app.get('/api/products/new-arrival', async (req, res) => {
    try {
        // Find products where ribbon contains 'new' (case insensitive)
        const products = await Product.find({ ribbon: { $regex: /new/i } })
            .sort({ createdAt: -1 })
            .limit(6);

        res.json(products);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch new arrivals' });
    }
});

// fetch all rippons
app.get('/api/ribbons', async (req, res) => {
    try {
        const data = await Rippon.find().sort({ createdAt: -1 });
        const ribbons = data.flatMap(r => r.ribbons);
        res.json(ribbons);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch ribbons' });
    }
});


/* ================== RIPBON EDIT ================== */
app.post('/api/ribbon/edit', async (req, res) => {
    try {
        const { oldRibbon, newRibbon } = req.body;
        if (!oldRibbon || !newRibbon) {
            return res.status(400).json({ success: false });
        }

        // Update Rippon collection
        await Rippon.updateMany(
            { ribbons: oldRibbon },
            { $set: { 'ribbons.$[elem]': newRibbon } },
            { arrayFilters: [{ elem: oldRibbon }] }
        );

        // Update Product ribbon
        await Product.updateMany(
            { ribbon: oldRibbon },
            { $set: { ribbon: newRibbon } }
        );

        // Update PageHeader ribbons
        await PageHeader.updateMany({}, {
            $set: {
                "pages.page1.sections.$[sec].ribbonPrimary": newRibbon
            }
        }, {
            arrayFilters: [{ "sec.ribbonPrimary": oldRibbon }]
        });

        await PageHeader.updateMany({}, {
            $set: {
                "pages.page1.sections.$[sec].ribbonSecondary": newRibbon
            }
        }, {
            arrayFilters: [{ "sec.ribbonSecondary": oldRibbon }]
        });

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});


/* ================== RIPBON DELETE ================== */
app.post('/api/ribbon/delete', async (req, res) => {
    try {
        const { ribbon } = req.body;
        if (!ribbon) return res.json({ success: false });

        // Remove from Rippon collection
        await Rippon.updateMany({}, { $pull: { ribbons: ribbon } });

        // Remove from Products
        await Product.updateMany({}, { $unset: { ribbon: "" } });

        // Remove from PageHeader
        await PageHeader.updateMany({}, {
            $unset: {
                "pages.page1.sections.$[].ribbonPrimary": "",
                "pages.page1.sections.$[].ribbonSecondary": ""
            }
        });

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.json({ success: false });
    }
});


/* ================== UPDATE CATEGORY ROUTES ================== */

// Add Subcategory
app.post('/api/add-subcategory', async (req, res) => {
    try {
        const { categoryId, subCategory } = req.body;
        if (!categoryId || !subCategory) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        await Category.findByIdAndUpdate(categoryId, {
            $addToSet: { subCategories: subCategory }
        });

        res.json({ success: true, message: 'Subcategory added' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Edit Category Name
app.post('/api/edit-category', async (req, res) => {
    try {
        const { categoryId, newName } = req.body;
        if (!categoryId || !newName) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const cat = await Category.findById(categoryId);
        if (!cat) return res.status(404).json({ error: 'Category not found' });
        const oldName = cat.category;

        await Category.findByIdAndUpdate(categoryId, { category: newName });

        await PageHeader.updateMany(
            {},
            { $set: { "pages.page1.categories.$[elem]": newName } },
            { arrayFilters: [{ elem: oldName }] }
        );

        await Product.updateMany(
            { category: oldName },
            { $addToSet: { category: newName } }
        );
        await Product.updateMany(
            { category: oldName },
            { $pull: { category: oldName } }
        );

        res.json({ success: true, message: 'Category updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Edit Category Image
app.post('/api/edit-category-image', upload.single('image'), async (req, res) => {
    try {
        const { categoryId } = req.body;
        if (!categoryId) return res.status(400).json({ error: 'Missing categoryId' });
        if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

        const cat = await Category.findById(categoryId);
        if (!cat) {
            try { fs.unlinkSync(path.join(uploadPath, req.file.filename)); } catch (e) {}
            return res.status(404).json({ error: 'Category not found' });
        }

        // delete old image if it exists
        try {
            if (cat.categoryImage) {
                fs.unlinkSync(path.join(uploadPath, path.basename(cat.categoryImage)));
            }
        } catch (e) {}

        cat.categoryImage = req.file.filename;
        await cat.save();

        res.json({ success: true, message: 'Category image updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete Category
app.post('/api/delete-category', async (req, res) => {
    try {
        const { categoryId } = req.body;
        if (!categoryId) return res.status(400).json({ error: 'Missing categoryId' });
        const cat = await Category.findById(categoryId);
        if (!cat) return res.status(404).json({ error: 'Category not found' });
        const name = cat.category;

        await Category.findByIdAndDelete(categoryId);

        await PageHeader.updateMany({}, { $pull: { "pages.page1.categories": name } });

        await Product.updateMany({}, { $pull: { category: name } });
        try {
            await Product.updateMany(
                { category: { $size: 0 } },
                [{ $set: { category: ["Uncategorized"] } }]
            );
        } catch (e) {
            console.warn('Fallback: unable to set Uncategorized via pipeline', e.message);
        }
        res.json({ success: true, message: 'Category deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete Subcategory
app.post('/api/delete-subcategory', async (req, res) => {
    try {
        const { categoryId, subCategory } = req.body;
        if (!categoryId || !subCategory) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        await Category.findByIdAndUpdate(categoryId, {
            $pull: { subCategories: subCategory }
        });
        await Product.updateMany({}, { $pull: { subCategory: subCategory } });
        res.json({ success: true, message: 'Subcategory deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Edit Subcategory
app.post('/api/edit-subcategory', async (req, res) => {
    try {
        const { categoryId, oldSubCategory, newSubCategory } = req.body;
        if (!categoryId || !oldSubCategory || !newSubCategory) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        await Category.findByIdAndUpdate(
            categoryId,
            { $set: { 'subCategories.$[elem]': newSubCategory } },
            { arrayFilters: [{ elem: oldSubCategory }] }
        );
        await Product.updateMany(
            { subCategory: oldSubCategory },
            { $addToSet: { subCategory: newSubCategory } }
        );
        await Product.updateMany(
            { subCategory: oldSubCategory },
            { $pull: { subCategory: oldSubCategory } }
        );
        res.json({ success: true, message: 'Subcategory updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

//get single product
app.get('/api/product/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        res.json(product);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});


// Update Product
app.post('/api/product/update/:id', upload.single('image'), async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).send('Product not found');

        const {
            name, ribbon, category, subCategory,
            description, price, oldPrice, discount, delivery,
            deliveryCharge, stock
        } = req.body;

        if (req.file) {
            // delete old image
            try {
                fs.unlinkSync(path.join(uploadPath, product.image));
            } catch {}
            product.image = req.file.filename;
        }

        product.name = name;
        product.ribbon = ribbon;
        product.category = Array.isArray(category) ? category : [category];
        product.subCategory = Array.isArray(subCategory) ? subCategory : [subCategory];
        product.description = description;
        product.price = price;
        product.oldPrice = oldPrice;
        product.discount = discount;
        product.delivery = delivery;
        product.deliveryCharge = deliveryCharge ?? product.deliveryCharge;
        product.stock = stock ?? product.stock;

        await product.save();

        res.send(`<script>
            alert('Product updated successfully ✅');
            window.location.href='/listproduct';
        </script>`);

    } catch (err) {
        console.error(err);
        res.send(`<script>
            alert('Update failed ❌');
            window.history.back();
        </script>`);
    }
});


/* ================== PAGES ================== */
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'pages/login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'pages/register.html')));
app.get('/add', (req, res) => res.sendFile(path.join(__dirname, 'access/add.html')));
app.get('/prod', (req, res) => res.sendFile(path.join(__dirname, 'access/product.html')));
app.get('/controls', (req, res) => res.sendFile(path.join(__dirname, 'access/controls.html')));
app.get('/home', (req, res) => res.sendFile(path.join(__dirname, 'pages/home.html')));
app.get('/about', (req, res) => res.sendFile(path.join(__dirname, 'pages/about.html')));
app.get('/services', (req, res) => res.sendFile(path.join(__dirname, 'pages/service.html')));
app.get('/contact', (req, res) => res.sendFile(path.join(__dirname, 'pages/contact.html')));
app.get('/category', (req, res) => res.sendFile(path.join(__dirname, 'access/category.html')));
app.get('/rippon', (req, res) => res.sendFile(path.join(__dirname, 'access/rippon.html')));
app.get('/listcategory',(req,res)=>res.sendFile(path.join(__dirname, 'access/listcategory.html')));
app.get('/listproduct',(req,res)=>res.sendFile(path.join(__dirname, 'access/listproduct.html')));
app.get('/edit-product',(req,res)=>res.sendFile(path.join(__dirname, 'access/edit-product.html')));
app.get('/list',(req,res)=>res.sendFile(path.join(__dirname, 'access/list.html')));
app.get('/deleted',(req,res)=>res.sendFile(path.join(__dirname, 'access/deleted.html')));
app.get('/listrippon', (req, res) =>res.sendFile(path.join(__dirname, 'access/listrippon.html')));
app.get('/profile', (req, res) => res.sendFile(path.join(__dirname, 'pages/profile.html')));
app.get('/orders', (req, res) => res.sendFile(path.join(__dirname, 'access/orders.html')));
app.get('/admin-orders', (req, res) => res.sendFile(path.join(__dirname, 'access/orders.html')));


/* ================== READ API ================== */
app.get('/api/pages', async (req, res) => {
    try {
        const data = await PageHeader.findOne().sort({ _id: -1 });
        res.json(data);
    } catch {
        res.status(500).json({ error: 'Fetch failed' });
    }
});

/* ================== GENERIC FIELD UPDATE/DELETE ================== */
function setDeep(obj, path, value){
    const parts = path.split('.').filter(Boolean);
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i];
        const idx = Number.isInteger(+key) ? +key : key;
        if (cur[idx] === undefined || cur[idx] === null) cur[idx] = {};
        cur = cur[idx];
    }
    const last = parts[parts.length - 1];
    const lastIdx = Number.isInteger(+last) ? +last : last;
    cur[lastIdx] = value;
}

function deleteDeep(obj, path){
    const parts = path.split('.').filter(Boolean);
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i];
        const idx = Number.isInteger(+key) ? +key : key;
        if (cur[idx] === undefined || cur[idx] === null) return;
        cur = cur[idx];
    }
    const last = parts[parts.length - 1];
    const lastIdx = Number.isInteger(+last) ? +last : last;
    if (Array.isArray(cur) && typeof lastIdx === 'number') {
        cur[lastIdx] = null;
    } else {
        delete cur[lastIdx];
    }
}

function restoreDeep(obj, path, value){
    const parts = path.split('.').filter(Boolean);
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i];
        const idx = Number.isInteger(+key) ? +key : key;
        if (cur[idx] === undefined || cur[idx] === null) {
            cur[idx] = Number.isInteger(+parts[i + 1]) ? [] : {};
        }
        cur = cur[idx];
    }
    const last = parts[parts.length - 1];
    const lastIdx = Number.isInteger(+last) ? +last : last;
    if (Array.isArray(cur) && typeof lastIdx === 'number') {
        if (cur[lastIdx] === undefined || cur[lastIdx] === null) {
            cur[lastIdx] = value;
        } else {
            cur.splice(lastIdx, 0, value);
        }
    } else {
        cur[lastIdx] = value;
    }
}

app.post('/api/pages/update-field', upload.single('file'), async (req, res) => {
    try {
        const { path: fieldPath, value } = req.body;
        if (!fieldPath) return res.status(400).json({ error: 'Missing path' });
        const pageDoc = await PageHeader.findOne().sort({ _id: -1 });
        if (!pageDoc) return res.status(404).json({ error: 'No PageHeader found' });
        const newVal = req.file ? req.file.filename : value;
        setDeep(pageDoc.pages, fieldPath, newVal);
        pageDoc.markModified('pages');
        await pageDoc.save();
        res.json({ success: true, value: newVal });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Update failed' });
    }
});

/* ================= DELETE FIELD ================= */
app.delete('/api/pages/delete', async (req, res) => {
  try {
    const { path, value, type } = req.body;
    if (!path) return res.status(400).json({ success: false, error: 'Missing path' });

    const pageDoc = await PageHeader.findOne().sort({ _id: -1 });
    if (!pageDoc) return res.status(404).json({ success: false, error: 'No PageHeader found' });

    await DeletedField.create({ path, value, type });

    deleteDeep(pageDoc.pages, path);
    pageDoc.markModified('pages');
    await pageDoc.save();

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

/* ================= LIST DELETED ================= */
app.get('/api/pages/deleted', async (req, res) => {
  const data = await DeletedField.find().sort({ deletedAt: -1 });
  res.json(data);
});

/* ================= RESTORE ================= */
app.post('/api/pages/restore', express.json(), async (req, res) => {
    try {
        const { id } = req.body;
        const item = await DeletedField.findById(id);
        if (!item) return res.status(404).json({ success: false, error: 'Not found' });

        const pageDoc = await PageHeader.findOne().sort({ _id: -1 });
        if (!pageDoc) return res.status(404).json({ success: false, error: 'No PageHeader found' });

        restoreDeep(pageDoc.pages, item.path, item.value);
        pageDoc.markModified('pages');
        await pageDoc.save();

        await DeletedField.findByIdAndDelete(id);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});



// GET home ribbons with products
app.get('/api/home-ribbon-products', async (req, res) => {
    try {
        const page = await PageHeader.findOne().sort({ _id: -1 });

        if (!page) {
            return res.json({ primary: null, secondary: null });
        }

        // Extract ribbons from page header
        const ribbonSection = page.pages.page1.sections.find(
            s => s.ribbonPrimary || s.ribbonSecondary
        );

        const ribbonPrimary = ribbonSection?.ribbonPrimary || null;
        const ribbonSecondary = ribbonSection?.ribbonSecondary || null;

        const primaryProducts = ribbonPrimary
            ? await Product.find({ ribbon: new RegExp(`^${ribbonPrimary}$`, 'i') })
                  .sort({ createdAt: -1 })
                  .limit(6)
            : [];

        const secondaryProducts = ribbonSecondary
            ? await Product.find({ ribbon: new RegExp(`^${ribbonSecondary}$`, 'i') })
                  .sort({ createdAt: -1 })
                  .limit(6)
            : [];

        res.json({
            primary: {
                name: ribbonPrimary,
                products: primaryProducts
            },
            secondary: {
                name: ribbonSecondary,
                products: secondaryProducts
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to load ribbon products' });
    }
});

//delete product
app.post('/api/product/delete/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.json({ success:false });

        // delete image
        try {
            fs.unlinkSync(path.join(uploadPath, product.image));
        } catch {}

        await product.deleteOne();

        res.json({ success:true });
    } catch (err) {
        res.json({ success:false });
    }
});



/* ================== SERVER ================== */

/* ================== E-COMMERCE & PROFILE APIS ================== */

// Current Auth User Status
app.get('/api/auth/me', async (req, res) => {
    try {
        const email = getAuthUser(req);
        if (!email) return res.json({ loggedIn: false });

        const isAdmin = email.includes('.admin');
        if (isAdmin) {
            const admin = await Admin.findOne({ email: new RegExp('^' + email + '$', 'i') }).select('-password');
            if (admin) {
                return res.json({
                    loggedIn: true,
                    user: { id: admin._id, username: admin.username, email: admin.email, role: 'admin' }
                });
            }
        }

        const user = await User.findOne({ email: new RegExp('^' + email + '$', 'i') }).select('-password');
        if (user) {
            return res.json({
                loggedIn: true,
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    phone: user.phone || '',
                    address: user.address || '',
                    city: user.city || '',
                    state: user.state || '',
                    pincode: user.pincode || '',
                    role: 'user'
                }
            });
        }

        res.json({ loggedIn: false });
    } catch {
        res.json({ loggedIn: false });
    }
});

// Logout API
app.post('/api/auth/logout', (req, res) => {
    res.setHeader('Set-Cookie', [
        'userEmail=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
        'userRole=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
        'userName=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
    ]);
    res.json({ success: true });
});

// Get User Profile
app.get('/api/user/profile', async (req, res) => {
    try {
        const email = getAuthUser(req);
        if (!email) return res.status(401).json({ error: 'Not authenticated' });

        const user = await User.findOne({ email: new RegExp('^' + email + '$', 'i') }).select('-password');
        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json(user);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// Update User Profile
app.post('/api/user/profile', express.json(), async (req, res) => {
    try {
        const email = getAuthUser(req);
        if (!email) return res.status(401).json({ error: 'Not authenticated' });

        const { username, phone, address, city, state, pincode } = req.body;
        const user = await User.findOne({ email: new RegExp('^' + email + '$', 'i') });
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (username) user.username = username.trim();
        if (phone !== undefined) user.phone = phone.trim();
        if (address !== undefined) user.address = address.trim();
        if (city !== undefined) user.city = city.trim();
        if (state !== undefined) user.state = state.trim();
        if (pincode !== undefined) user.pincode = pincode.trim();

        await user.save();
        res.json({ success: true, message: 'Profile updated successfully', user });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Create Order (User Purchases Product)
app.post('/api/orders/create', express.json(), async (req, res) => {
    try {
        const email = getAuthUser(req) || req.body.userEmail;
        if (!email) return res.status(401).json({ error: 'Please login to place an order' });

        const user = await User.findOne({ email: new RegExp('^' + email + '$', 'i') });
        const {
            items,
            totalAmount,
            phone,
            address,
            city,
            state,
            pincode,
            userName,
            paymentMethod
        } = req.body;

        if (!items || !items.length || !totalAmount) {
            return res.status(400).json({ error: 'Invalid order items or total amount' });
        }

        const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);

        const newOrder = new Order({
            orderId,
            userId: user?._id,
            userName: userName || user?.username || 'Customer',
            userEmail: email,
            phone: phone || user?.phone || '',
            shippingAddress: {
                address: address || user?.address || '',
                city: city || user?.city || '',
                state: state || user?.state || '',
                pincode: pincode || user?.pincode || ''
            },
            items: items.map(item => ({
                productId: item.productId || item._id,
                name: item.name,
                price: Number(item.price),
                quantity: Number(item.quantity) || 1,
                image: item.image || ''
            })),
            totalAmount: Number(totalAmount),
            paymentMethod: paymentMethod || 'Cash on Delivery (COD)',
            status: 'Pending'
        });

        await newOrder.save();

        // Save delivery details to user profile if not yet populated
        if (user) {
            if (phone && !user.phone) user.phone = phone;
            if (address && !user.address) user.address = address;
            if (city && !user.city) user.city = city;
            if (state && !user.state) user.state = state;
            if (pincode && !user.pincode) user.pincode = pincode;
            await user.save();
        }

        res.json({ success: true, orderId, order: newOrder });
    } catch (err) {
        console.error('Order creation error:', err);
        res.status(500).json({ error: 'Failed to create order: ' + err.message });
    }
});

// User Orders List
app.get('/api/user/orders', async (req, res) => {
    try {
        const email = getAuthUser(req);
        if (!email) return res.status(401).json({ error: 'Not authenticated' });

        const orders = await Order.find({ userEmail: new RegExp('^' + email + '$', 'i') }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch user orders' });
    }
});

// Admin All Orders List
app.get('/api/admin/orders', async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch admin orders' });
    }
});

// Admin Order Status Update (Accept / Out for Delivery / Deliver / Cancel)
app.post('/api/admin/orders/update-status', express.json(), async (req, res) => {
    try {
        const { orderId, status } = req.body;
        if (!orderId || !status) return res.status(400).json({ error: 'Order ID and status required' });

        const allowed = ['Pending', 'Accepted', 'Out for Delivery', 'Delivered', 'Cancelled'];
        if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });

        const order = await Order.findOne({ orderId });
        if (!order) return res.status(404).json({ error: 'Order not found' });

        order.status = status;
        await order.save();

        res.json({ success: true, order });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update order status' });
    }
});

app.listen(9000, () => {
    console.log('Server running → http://localhost:9000');
});
