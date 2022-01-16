const express = require('express')
const app = express();
const bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({ extended: true }))

const MongoClient = require('mongodb').MongoClient;
app.set('view engine', 'ejs');

app.use('/public', express.static('public'));

const methodOverride = require('method-override')
app.use(methodOverride('_method'))

/************mongoDB에 저장하기위해 셋팅하기************/
var db;
MongoClient.connect('mongodb+srv://admin:qwer1234@cluster0.awlm3.mongodb.net/myFirstDatabase?retryWrites=true&w=majority',
    function (에러, client) {
        //에러를 확인하고 싶을 때
        if (에러) return console.log(에러)
        //연결되면 할 일 
        db = client.db('todoapp');
        // db.collection('post').insertOne({_id:1, 이름: 'heina', 나이 :20}, function(에러, 결과){
        //     console.log('저장완료')
        // });
        app.listen(8080, function () {
            console.log('listening on 8080')
        });

    })

app.get('/pet', function (요청, 응답) {
    응답.send('반갑습니다');
});

app.get('/beauty', function (request, response) {
    response.send('뷰티용품 사세요')
});

/************서버 요청해서 가져오기 ************/
// html 파일 보내기 .sendFile(보낼경로)
app.get('/', function (요청, 응답) {
    응답.render('index.ejs');
});
app.get('/write', function (요청, 응답) {
    응답.render('write.ejs');
});
app.get('/upload', function(요청, 응답){
    응답.render('upload.ejs');
});

/************ejs렌더하고, DB에서 가져와서 보여주기 ************/
//list로 get 요청하면 , 실제 DB에 저장된 데이터를 예쁘게 꾸며진 HTML로 보여준다
app.get('/list', function (요청, 응답) {
    //db에 저장된 post 라는 collection 안의 제목이 뭐인 데이터를 꺼내주세요
    db.collection('post').find().toArray(function (에러, 결과) {
        console.log(결과);
        응답.render('list.ejs', { posts: 결과 });
    });
})


/************detail로 접속하면 해당 detail.ejs (상세페이지)보여주기************/
app.get('/detail/:id', function (요청, 응답) {
    db.collection('post').findOne({ _id: parseInt(요청.params.id) }, function (에러, 결과) {
        //url의 파라미터중에 id라고 이름 지은 걸 넣어주세요
        if (에러) {
            return console.log(에러)
        }
        console.log(결과)
        응답.render('detail.ejs', { data: 결과 })
    })
})


/********************edit 페이지 가져오기 **********************/
app.get('/edit/:id', function (요청, 응답) {
    db.collection('post').findOne({ _id: parseInt(요청.params.id) }, function (에러, 결과) {
        console.log(결과)
        응답.render('edit.ejs', { post: 결과 })
    })
})

/********************PUT요청작성**********************/
app.put('/edit', function (요청, 응답) {
    //updateOn({어떤게시물수정할건지},{수정값},콜백함수)
    db.collection('post').updateOne({ _id: parseInt(요청.body.id) }, { $set: { 오늘의할일: 요청.body.title, 날짜: 요청.body.date } }, function (에러, 결과) {
        console.log('수정완료')
        응답.redirect('/list') //요청된 후 페이지 이동
    })
})


/*******************login 기능을 위한 라이브러리 첨부**********************/
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const {ObjectId} = require('mongodb');

app.use(session({ secret: '비밀코드', resave: true, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

app.get('/login', function (요청, 응답) {
    응답.render('login.ejs')
})

//passport: 로그인 기능을 쉽게 구현 도와줌
app.post('/login', passport.authenticate('local', {
    failureRedirect: '/fail'
    //'local'이라는 방식으로 인증해주세요
    //로그인을 실패하면 /fail 경로로 이동해 주세요
}), function (요청, 응답) {
    응답.redirect('/')
    //회원인증 성공하면 /로 보내주세요 
})
passport.use(new LocalStrategy({
    usernameField: 'id', //form의 name 속성
    passwordField: 'pw',
    session: true, //로그인 후 세션 저장할거야?
    passReqToCallback: false, //아이디/비번말고도 다른 정보 검증시
}, function (입력한아이디, 입력한비번, done) { //사용자의 아이디 검증
    //console.log(입력한아이디, 입력한비번);
    db.collection('login').findOne({ id: 입력한아이디 }, function (에러, 결과) {
        if (에러) return done(에러)
        //very 중요
        if (!결과) return done(null, false, { message: '존재하지않는 아이디요' })
        //결과에 아무것도 안담겨 있을 때 
        if (입력한비번 == 결과.pw) { //결과에 무언가 있다. pw와 입력비번 비교
            return done(null, 결과)
        } else {
            return done(null, false, { message: '비번틀렸어요' })
        }
    })
}));



/**********세션을 저장하는 코드**********/
passport.serializeUser(function (user, done) {
    //serializeUser = 세션을 저장시키는 코드 - 로그인 성공시 발동
    done(null, user.id)
});
passport.deserializeUser(function (아이디, done) {
    //세션 데이터를 가진 사람중 db와 비교 - 마이페이지 접속시 발동
    db.collection('login').findOne({ id: 아이디 }, function (에러, 결과) {
        done(null, 결과)
    })
})

/**********회원가입기능**********/
app.post('/register', function (요청, 응답) {
    db.collection('login').insertOne({ id: 요청.body.id, pw: 요청.body.pw },
        function (에러, 결과) {
            응답.redirect('/'); //가입완료되면 메인페이지
        })
})

/**********로그인 확인하기**********/
app.get('/mypage', 로그인했니, function (요청, 응답) {
    요청.user //deserializeUser()에서 찾았던 정보를 넣어준다.
    console.log(요청.user);
    응답.render('mypage.ejs', { 사용자: 요청.user })
})

function 로그인했니(요청, 응답, next) {
    if (요청.user) {
        next()
    } else {
        응답.send('로그인안하셨는데요?')
    }
}

/************채팅방 가져오기(생성, 채팅방들어가기)************/
app.post('/chatroom', 로그인했니, function(요청,응답){
    var 저장할거 = { 
        member : [ObjectId(요청.body.당한사람id), 요청.user._id],
        date : new Date(),
        title : "무슨무슨채팅방"
    }
    //콜백함수대신 .then 사용해서 쓸 수 있음
    db.collection('chatroom').insertOne(저장할거).then((결과)=>{
        응답.send('성공');
    })
    // app.collection('chatroom').find({ member : 요청.user._id },function(에러,결과){
    //     응답.render('chat.ejs',{ posts: 결과 });
    // })
});

app.get('/chat', 로그인했니, function(요청, 응답){
    db.collection('chatroom').find({ member : 요청.user._id }).toArray().then((결과)=>{
        응답.render('chat.ejs', {data : 결과});
    })
})

//채팅 메시지 입력시 DB 저장
app.post('/message', 로그인했니, function(요청, 응답){
    var 저장할거 = {
        parent: 요청.body.parent,
        content: 요청.body.content,
        userid: 요청.user._id,
        date: new Date(),
    }
    db.collection('message').insertOne(저장할거).then(()=>{
        console.log('성공');
        응답.send('db저장성공');
    })
});
//서버와 유저간 실시간 소통채널 열기
app.get('/message/:id', 로그인했니, function(요청, 응답){

    응답.writeHead(200, {
      "Connection": "keep-alive",
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    });

    db.collection('message').find({parent : 요청.params.id}).toArray()
    .then((결과)=>{
        응답.write('event: test\n');
        응답.write(`data: ${JSON.stringify(결과)}\n\n`);
    })
    // 서버가 유저에게 실시간 정보 전송
    
    //Change Stream 설정법
    const 찾을문서 = [
        { $match: {'fullDocument.parent': 요청.params.id} }
    ];
    const changeStream = db.collection('message').watch(찾을문서);
    
    changeStream.on('change', (result) => {
        응답.write('event: test\n');
        응답.write(`data: ${JSON.stringify([result.fullDocument])}\n\n`);
    });
  
  });

/************게시물 발행하기(DB에 넣기)************/
app.post('/add', 로그인했니, function (요청, 응답) {
    응답.send('전송완료');
    //find() 는 data 를 다 찾고싶을 때, findeOne()은 특정값만 찾고 싶을 때 
    db.collection('counter').findOne({ name: '게시물갯수' }, function (에러, 결과) {
        console.log(결과.totalPost); //총게시물 갯수
        var 총게시물갯수 = 결과.totalPost
        var 저장할거 = { _id: 총게시물갯수 + 1, 오늘의할일: 요청.body.title, 날짜: 요청.body.date, 작성자: 요청.user._id }
        db.collection('post').insertOne(저장할거, function (에러, 결과) {
            console.log('전송완료');
            //counter라는 콜렉션에 있는 totalPost라는 항목도 1 증가시켜야함 (수정)
            //updateOne() updateMany() 사용가능
            //operator 연산자 : $set(변경), $inc(증가), $min(기존값보다 적을 때만 적용), $rename(key값 이름 변경)
            db.collection('counter').updateOne({ name: '게시물갯수' }, { $inc: { totalPost: 1 } }, function (에러, 결과) {
                if (에러) { return console.log(에러) }
            })
        })
    }); //Query문

})


/************DB에서 data 삭제하기 ************/
app.delete('/delete', function (요청, 응답) {
    console.log(요청.body)
    요청.body._id = parseInt(요청.body._id); // 정수로 변환해줌 

    var 삭제할데이터 = { _id : 요청.body._id, 작성자: 요청.user._id} //두개가 일치하는 값만 삭제해줌
    db.collection('post').deleteOne(삭제할데이터, function (에러, 결과) {
        console.log('삭제완료')
        if(에러){
            console.log(에러)
        }
        응답.status(200).send({ message: '성공했습니다.' }); //응답코드 200을 보내주세요
    })
})


/**********서버에서 query string 꺼내기 **********/
app.get('/search', (요청, 응답) => {
    var 검색조건 = [
        {
            $search: {
                index: 'titleSearch',
                text: {
                    query: 요청.query.value, //실제로 검색어 입력하는 부분
                    path: '오늘의할일'  // 제목날짜 둘다 찾고 싶으면 ['제목', '날짜']
                }
            }
        },
        // //검색 조건 더주기 - 결과 정렬하기
        // {$sort : { _id : -1}},

        // //제한하기 
        // {$limit : 10},

        // //searchScore  빔프로젝터같은 보여주기
        // {$project:{오늘의할일:1, _id:0,score:{$meta:"searchScore"}}},
        // //1은 보여주고 0은 안보여준다  score은 자동으로 점수를 준다
    ]
    db.collection('post').aggregate(검색조건).toArray((에러, 결과) => {
        console.log(결과);
        /**********검색 결과 보여주기**********/
        응답.render('search.ejs', { posts: 결과 })
    });
})


/**********router 가져오기**********/
app.use('/shop', require('./routes/shop.js'));
//app.use(미들웨어) , 요청시 주소 사용할 때 . 붙이는건 국룰임 
//미들웨어 : 요청과 응답사이에 실행되는 코드

app.use('/board/sub', require('./routes/board.js'));


/************이미지 업로드하기 ************/
let multer = require('multer');
var storage = multer.diskStorage({ //multer를 이용한 이미지 하드에 저장하기
    destination : function(req, file, cb){
        cb(null, './public/image') // 파일 저장됨
    },
    filename : function(req, file, cb){
        cb(null, file.originalname) //저장한 이미지의 파일을 설명하는 부분
    }
}) 

var upload = multer({storage : storage}); 

// html 파일 보내기 .sendFile(보낼경로)
app.get('/upload', function(요청, 응답){
    응답.render('upload.ejs');
});

app.post('/upload', upload.single('프로필'), function(요청, 응답){
    응답.send('업로드완료');
})

//업로드한 이미지 보여주기
/* app.get('/image/:이미지이름', function(요청, 응답){
    응답.sendFile(__dirname + '/public/image' + 이미지이름)
})*/
app.get('/image/:imageName', function(요청, 응답){
    응답.sendFile(__dirname + '/public/image/' + 요청.params.imageName)
})




