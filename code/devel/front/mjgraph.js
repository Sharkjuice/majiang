define(['../common/mjutils.js'], function(mjutils){
    let renderer,camera,scene
    let screenWidth = -1
    let screenHeight = -1
    let zhuoziWidth = -1
    let zhuoziHeight = -1
    let ar = -1
    let scale = -1
    let sm1 = -1
    let sm2 = -1
    let pw0 = -1
    let pw1 = -1
    let pw2 = -1
    let ph0 = -1
    let ph1 =  -1
    let ph2 = -1
    let pd0 = -1
    let pd1 = -1
    let pd2 = -1
    let em = -1


    //x,y是长方形的水平、竖直长度
    function rectHole(x,y){
        // create a basic shape
        const shape = new THREE.Path();
        const points= [[x/2, -y/2],[x/2, y/2],[-x/2, y/2],[-x/2, -y/2]]
        shape.moveTo(points[3][0], points[3][1])
        points.forEach(function(point){
            shape.lineTo(point[0],point[1] );
        })
        return shape
    }

    //x,y是长方形的水平、竖直长度
    function rectShape(x,y){
        // create a basic shape
        const shape = new THREE.Shape();
        const points= [[x/2, -y/2],[x/2, y/2],[-x/2, y/2],[-x/2, -y/2]]
        shape.moveTo(points[3][0], points[3][1])
        points.forEach(function(point){
            shape.lineTo(point[0],point[1] );
        })
        return shape
    }

    function initRender() {
        renderer = new THREE.WebGLRenderer({antialias: true}) 
        let center_div = document.getElementById("center")
        renderer.setSize(screenWidth, screenHeight)
        center_div.appendChild(renderer.domElement)
        return renderer
    }

     function initCamera(ar) {
        camera = new THREE.PerspectiveCamera(45, ar, 1, 2000);
        let camera_z = 440/Math.tan(Math.PI/8)
        let camera_y = 0
        //camera_z2 = Math.sqrt(camera_z*camera_z - camera_y*camera_y)
        camera.position.set( 0, camera_y, camera_z);
        camera.up.set(0,1,0);
        camera.lookAt( 0, 0, 0);
        return camera
    }

    function initScene() {
        scene = new THREE.Scene();
        // White directional light at half intensity shining from the top.
        const directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
        directionalLight.position.set(0,0,200)

        const directionalLight2 = new THREE.DirectionalLight( 0xffffff, 0.3);
        directionalLight2.position.set(0,200,10)
        const ambientlight = new THREE.AmbientLight( 0xa0a0a0 ); // soft white light
        scene.add( ambientlight )
        scene.add(directionalLight)
        scene.add(directionalLight2)
        //scene.add(pointLight)
        return scene
    }

    function init(){
        let landscape_ready = false
        if(mjutils.isSafari){
            switch(window.orientation) {
                case 90: // landscape
                case -90: // landscape
                    landscape_ready = true
                    break
                default:
                    landscape_ready = fasle
                    mjutils.Tips.show("请横屏操作")
            }
        }else{
            landscape_ready = true
        }
        
        if(landscape_ready){
            screenWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
            screenHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
            renderer = initRender()
            scene = initScene()
            ar = screenWidth/screenHeight
            camera = initCamera(ar) 
            zhuoziWidth = 880*ar
            zhuoziHeight = 880
            scale = screenHeight/880
            sm1 = (zhuoziWidth-60)/(17.0*30)
            sm2 = (zhuoziHeight-60)/(17.0*30)
            pw0 = 30
            ph0 = 40
            pd0 = 20
            pw1 = pw0*sm1 + 1
            ph1 = ph0*sm1 + 1
            pd1 = pd0*sm1 + 1
            pw2 = pw0*sm2 + 1
            ph2 = ph0*sm2 + 1  
            pd2 = pd0*sm2 + 1
            em = 12

            if(screenWidth >= 640 && screenWidth < 700){
                em = 12
            }else
            if(screenWidth >= 701 && screenWidth < 800){
                em = 14
            }else
            if(screenWidth >= 801 && screenWidth < 900)
            {
                em = 15
            }else
            if(screenWidth >= 901 && screenWidth < 1000){
                em = 16
            }else
            if(screenWidth >= 1001 && screenWidth < 1280){
                em = 18        
            }else{
                em = 24
            }
        }
    
        return landscape_ready
    }

    function getScreenSize(){
        return {width:screenWidth, height:screenHeight}
    }

    function getPaizhuoSize(){
        return {width:zhuoziWidth, height:zhuoziHeight}
    }

    function getPaiSize0(){
        return {width:pw0, height:ph0,depth:pd0}
    }
    function getPaiSize1(){
        return {width:pw1, height:ph1, depth: pd1}
    }
    function getPaiSize2(){
        return {width:pw2, height:ph2, depth: pd2}
    }
    function getFactors(){
        return {ar: ar, sm1: sm1, sm2: sm2,em:em,scale:scale}
    }

    function rerender() {
        renderer.render(scene, camera);
    }

    function getCamera(){
        return camera
    }

    function getScene(){
        return scene
    }


    return {rectHole, rectShape, init, rerender,getCamera, getScene,
        getScreenSize,getPaizhuoSize, getPaiSize0, getPaiSize1, getPaiSize2,getFactors}
})