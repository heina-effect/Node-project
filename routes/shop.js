var router = require('express').Router(); 
//npm으로 설치한 express 라이브러리의 router 함수 사용하겠습니다

// require('/shop.js');
// require('파일경로') or require('라이브러리명')
function 로그인했니(요청, 응답, next) {
    if (요청.user) {
        next()
    } else {
        응답.send('로그인안하셨는데요?')
    }
}

router.use('/shirts', 로그인했니);

//app.get -> router.get 으로 변경
router.get('/shirts', function(요청, 응답){
    응답.send('셔츠 파는 페이지입니다');
});

router.get('/pants', function(요청, 응답){
    응답.send('바지 파는 페이지입니다');
});

module.exports = router;
// module.exports = 내보낼 변수명
//js 파일을 다른 곳에서 사용하고 싶을 때 