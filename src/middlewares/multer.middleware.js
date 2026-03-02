import multer from "multer";

const storage = multer.diskStorage({ 
    destination: function (req, file, cb) {
        cb(null, '.public/temp'); // specify the directory where you want to save the uploaded files
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname); // create a unique filename using the original name and a timestamp
    }   
})

const upload = multer({ storage: storage });

export default upload;
