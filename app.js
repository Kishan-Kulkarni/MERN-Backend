require("dotenv").config();

const express = require("express");
const bodyparser = require("body-parser");
const cors=require('cors')
const mongoose=require('mongoose')
const bcrypt=require('bcrypt')
const saltRounds=10
const salt = bcrypt.genSaltSync(saltRounds)
const jwt = require('jsonwebtoken');
const secret=process.env.SECRET
const multer = require('multer');


const uploadMiddleware = multer({ dest: 'uploads/' })
const fs = require('fs');


const app = express();
mongoose.connect(process.env.DATABASE, { useNewUrlParser: true ,useUnifiedTopology: true,});
app.use(bodyparser.json({limit: '1000kb'}));
app.use(bodyparser.urlencoded({ extended: true}));
app.use(
  cors({
    origin: "*", 
    credentials: false,
  })
);
app.use('/uploads', express.static(__dirname + '/uploads'));


const userSchema = new mongoose.Schema({
  username: {type:String, required:true, min:4, unique:true},
  password: {type:String,  min:6},
});

const postSchema=new mongoose.Schema({
  id:{type:String},
  title:{type:String},
  summary:{type:String},
  image:{type:String},
  content:{type:String}
}, {
  timestamps: true,
})

const User = mongoose.model("User", userSchema)
const Post= mongoose.model("Post", postSchema)



app.post('/user', async (req, res)=>{
  const {id}=req.body
  const user=await User.findById({_id:id})
  res.json({username:user.username})
})

app.get('/post/:postId', async (req,res)=>{
  const postid=req.params.postId
  const post = await Post.findById({_id:postid})
  res.json({post:post})
})

app.get('/', async (req, res) => {
	const token = req.headers['x-access-token']

	try {
		const decoded = jwt.verify(token, secret)
		const username = decoded.username
		const user = await User.findOne({ username: username })

		 res.json({ status: 'ok', id: user.id })
	} catch (error) {
		console.log(error)
		res.json({ status: 'error', error: 'invalid token' })
	}
})

app.post("/register", function(req, res){
   User.create({username:req.body.username, password:bcrypt.hashSync(req.body.password, salt)})
  res.json({isAuthenticated:true})
  });

app.post('/login',  async (req,res) => {
  const {username,password} = req.body;
  const userDoc = await User.findOne({username});
  if(userDoc){
    const passOk = bcrypt.compareSync(password, userDoc.password);
  if (passOk) {
    jwt.sign({username,id:userDoc._id}, secret, {
      expiresIn: '24h',
  }, (err,token) => {
      if (err) res.json({err});
      res.json({token,user:{
        id:userDoc._id,
        username,
      }, ok:true})
    });
  } else {
    res.json({token:null,user:null})
  }
  }else{
    res.sendStatus(404).json({token:null,user:null})
  }
  
});

app.post('/post', uploadMiddleware.single('file'), async (req,res)=>{
  const {originalname,path} = req.file;
  const parts = originalname.split('.');
  const ext = parts[parts.length - 1];
  const newPath = path+'.'+ext;
  fs.renameSync(path, newPath);

  const {title,summary,content,id} = req.body;
  try {
     Post.create({
      id:id,
      title:title,
      summary:summary,
      image:newPath,
      content:content,}
    )
    res.sendStatus(200).json({posted:true})
  } catch (error) {
    res.sendStatus(400).json(error)
  }
})

app.get('/post' , async (req, res)=>{
  const data=await Post.find()
  res.json({status:"ok", posts:data})
})


app.post('/edit', async (req, res)=>{
  const {id}=req.body
  const data= await Post.findById({_id:id})
  res.json({post:data})
})

app.put('/post' ,uploadMiddleware.single('file') , async (req, res)=>{
  let newPath = null;
  if (req.file) {
    const {originalname,path} = req.file;
    const parts = originalname.split('.');
    const ext = parts[parts.length - 1];
    newPath = path+'.'+ext;
    fs.renameSync(path, newPath);
  }

  const {id,title,summary,content,_id} = req.body
  const post=await Post.findById(_id)
  try {
    const postDoc = await Post.findByIdAndUpdate(_id, {
      id,
      title,
      summary,
      content,
      image: newPath ? newPath : post.image,
    })
    res.json(postDoc)
  } catch (error) {
    throw error
  }
  
  
})

const port=process.env.PORT || 3000

app.listen(port, ()=>{
    console.log('Server started')
})


