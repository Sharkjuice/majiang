define(['../common/mjconst.js', '../common/mjtable.js', './mjgraph.js','./mjpaizhuo.js','../common/mjutils.js'], 
function (mjconst, mjtable, mjgraph,mjpaizhuo,mjutils) { 
    let sm1,sm2,pw2,pw1,ph2,ph1
    let is_ready = false
    let ready_callback

    function ready(){
        return is_ready
    }
    function onReady(cb){
        ready_callback = cb
    }

    function init(){
        let factors = mjgraph.getFactors()
        sm1 = factors.sm1
        sm2 = factors.sm2
        size = mjgraph.getPaiSize1()
        pw1 = size.width
        ph1 = size.height
        size = mjgraph.getPaiSize2()
        pw2 = size.width
        ph2 = size.height
        initTexture()
    }    

    const hml = 221/2 //麻将牌长度的一半
    const hmw = 156/2 //麻将牌宽度的一半

    //各麻将图像的中心位置， 麻将的size固定是156X221    
    const face_boxes = [
        //1筒~9筒
        [40, 220, 533,762],[245, 415, 533, 762],[440, 608, 533, 762],[640, 810, 533, 762],[840, 1006, 533, 762],
        [1035, 1205, 533, 762],[1235, 1400, 533, 762],[1432, 1598, 533, 762],[1628, 1808, 533, 762],
        //1条~9条
        [40, 220, 285, 512],[245, 415, 285, 512],[440, 608, 285, 512],[640, 810, 285, 512],[840, 1006,285, 512],
        [1035, 1205,285,512],[1235, 1400, 285,512],[1432,1598,285,512],[1628, 1808,285,512],
        //1万~9万
        [40, 220, 22,248],[245,415, 22,248],[440,608,  22,248],[640,810, 22,248],[840,1006, 22,248],
        [1035, 1205, 22,248],[1235, 1400, 22,248],[1432,1598, 22,248],[1628, 1808, 22,248],
        //中/發/東/南/西/北/白板
        [640,810,785,1007], [840,1006,785,1007],[1035, 1205,785,1007],[440,608, 785,1007],
        [1235, 1400,785,1007],[40, 220,  785,1007],[245,415, 785,1007]
        ]

    var uvList = []
    var mesh1,mesh2,material3

    function initTexture(thenCall){ 
        face_boxes.forEach( item => {
            var uv_left = item[0]/2048
            var uv_top = (1024-item[2])/1024
            var uv_right = item[1]/2048
            var uv_bottom = (1024-item[3])/1024
        
            var uv = [
                new THREE.Vector2(uv_left, uv_bottom),
                new THREE.Vector2(uv_right, uv_bottom),
                new THREE.Vector2(uv_right, uv_top),
                new THREE.Vector2(uv_left, uv_top)
                ];  
        
            // var uv = new Float32Array([
            //     uv_left, uv_bottom,
            //     uv_left, uv_top,
            //     uv_right, uv_top,
            //     uv_right, uv_bottom]
            // )
            uvList.push(uv) 
        })
        texture_loader = new THREE.TextureLoader()
        texture_loader.load('/images/majiang30.png', texture => {
            mjutils.Tips.show("加载图片...")
            // 立即使用纹理进行材质创建
            material3 = new THREE.MeshPhongMaterial({ map: texture,transparent: true});

            const geometry1 = new THREE.ExtrudeGeometry( drawPai(), {amount :6,bevelEnabled: false} );        
            const material1 = new THREE.MeshPhongMaterial( { color:  0x6ab4f3});
    //        const material1 = new THREE.MeshPhongMaterial( { color:  0x419b45 } );

            mesh1 = new THREE.Mesh( geometry1, material1) ;
            mesh1.name = "paidi"

            const geometry2 = new THREE.ExtrudeGeometry( drawPai(), {amount :14,bevelEnabled: false} );
            //const material2 = new THREE.MeshStandardMaterial( { color:  0xeaf2fd } );
            const material2 = new THREE.MeshPhongMaterial( { color:  0xeaf2fd } );
            //const material2 = new THREE.MeshPhysicalMaterial( { color:  0xffffff } );

            mesh2 = new THREE.Mesh( geometry2, material2) ;
            mesh2.name = "paishen"
            mesh2.position.set(0,0,6)
            mjutils.Tips.show("加载图片完成!")
            is_ready = true
            if(ready_callback){
                ready_callback()
            }
        })
    }


    class Pai extends mjtable.Face {
        constructor(index){
            super(index)
            this.selected = false
            if (this.facetype < 0 || this.facetype > 33) return null
            const geometry3 = new THREE.ShapeGeometry(drawPaimian());
            //geometry3.setAttribute("uv", new THREE.Float32BufferAttribute(uvList[this.facetype], 2))
            geometry3.faceVertexUvs[0][0] = [uvList[this.facetype][3], uvList[this.facetype][0], uvList[this.facetype][1]]
            geometry3.faceVertexUvs[0][1] = [uvList[this.facetype][1], uvList[this.facetype][2], uvList[this.facetype][3]]

            const mesh3 = new THREE.Mesh( geometry3, material3) ; 
            mesh3.position.set(0,0,20.1)
            mesh3.name = "paimian"

            const group = new THREE.Object3D()
            group.add(mesh1.clone())
            group.add(mesh2.clone())
            group.add(mesh3)
            //group.visible = false
            group.name = "pai"
            
            mjgraph.getScene().add(group)
            this.model = group
            this.model.visible = false
        }

        setVisible(show){
            this.model.visible = show
        }
        //摸牌， 位置从0~13/14
        showMopai(wei, pos){
            this.setVisible(true)
            this.selected = false
            let new_pos
            switch (wei) {
                case mjconst.ME:
                    this.model.scale.set(sm1,sm1,sm1)
                    this.model.rotation.set(0, 0, 0)
                    this.model.position.set(pos, 0, 0)
                    new_pos = pos + pw1
                    break

                case mjconst.RIGHT:
                    this.model.scale.set(sm2,sm2,sm2)
                    this.model.rotation.set(Math.PI/2, Math.PI/2, 0) 
                    this.model.position.set(0, pos, 0)
                    new_pos = pos + pw2
                    break   
                case mjconst.OPPOSITE:
                    this.model.scale.set(sm2,sm2,sm2)
                    this.model.rotation.set(Math.PI/2, Math.PI, 0)
                    this.model.position.set(pos, 0,0)
                    new_pos = pos - pw2
                    break
                case mjconst.LEFT:
                    this.model.scale.set(sm2,sm2,sm2)
                    this.model.rotation.set(Math.PI/2,  -Math.PI/2, 0)
                    this.model.position.set(0, pos, 0) 
                    new_pos = pos - pw2
                    break    
            }
            mjpaizhuo.mopaiqu[wei].add(this.model)
            return new_pos
        
        }

        //把牌放到打牌位置
        showDapai(wei,weizhi){
            let row = Math.floor(weizhi/10)
            let col = weizhi%10

            this.model.scale.set(sm2,sm2,sm2)

            switch (wei) {
                case mjconst.ME:
                    this.model.position.set(col*pw2, -row*ph2, 0) 
                    break  
                case mjconst.RIGHT:
                    this.model.rotation.set(0, 0, Math.PI/2) 
                    this.model.position.set(row*ph2, col*pw2, 0)
                    break
                case mjconst.OPPOSITE:
                    this.model.rotation.set(0, 0, Math.PI)
                    this.model.position.set(-col*pw2, row*ph2, 0) 
                    break  
                case mjconst.LEFT:
                    this.model.rotation.set(0, 0, -Math.PI/2)
                    this.model.position.set(-row*ph2, -col*pw2, 0)  
                    break                        

            }
            mjpaizhuo.dapaiqu[wei].add(this.model)   
            mjpaizhuo.mopaiqu[wei].remove(this.model)
        }
        
        showChipengpai(wei, pos){
            switch (wei) {
                case mjconst.ME:
                    this.model.scale.set(sm1, sm1, sm1)
                    this.model.rotation.set(0, 0, 0)
                    this.model.position.set(pos, 0, 0)
                    pos += pw1
                    break  
                case mjconst.RIGHT:
                    this.model.scale.set(sm2, sm2, sm2)
                    this.model.rotation.set(0, 0, Math.PI/2) 
                    this.model.position.set(0, pos, 0)
                    pos += pw2
                    break
                case mjconst.OPPOSITE:
                    this.model.scale.set(sm2, sm2, sm2)
                    this.model.rotation.set(0, 0, Math.PI) 
                    this.model.position.set(pos, 0, 0)
                    pos -= pw2
                    break  
                case mjconst.LEFT:
                    this.model.scale.set(sm2, sm2, sm2)
                    this.model.rotation.set(0, 0, -Math.PI/2)
                    this.model.position.set(0, pos, 0)
                    pos -= pw2
                    break
            }
            mjpaizhuo.mopaiqu[wei].add(this.model)
            return pos    
        }

        showMinggangpai(wei, pos, index){
            switch (wei) {
                case mjconst.ME:
                    this.model.scale.set(sm1, sm1, sm1)
                    this.model.rotation.set(0, 0, 0)
                    this.model.position.set(pos, 0, 0)
                    pos += pw1
                    break  
                case mjconst.RIGHT:
                    this.model.scale.set(sm2, sm2, sm2)
                    this.model.rotation.set(0, 0, Math.PI/2) 
                    if(index == 3){
                        pos -= pw2
                        this.model.position.set(-ph2, pos, 0)
                    }else{
                        this.model.position.set(0, pos, 0)
                    }
                    pos += pw2
                    break
                case mjconst.OPPOSITE:
                    this.model.scale.set(sm2, sm2, sm2)
                    this.model.rotation.set(0, 0, Math.PI) 
                    this.model.position.set(pos, 0, 0)
                    pos -= pw2
                    break  
                case mjconst.LEFT:
                    this.model.scale.set(sm2, sm2, sm2)
                    this.model.rotation.set(0, 0, -Math.PI/2)
                    if(index == 3){
                        pos += pw2
                        this.model.position.set(ph2, pos, 0)
                    }else{
                        this.model.position.set(0, pos, 0)
                    }
                    pos -= pw2
                    break
            }
            mjpaizhuo.mopaiqu[wei].add(this.model)
            return pos    
        }

        showAngangpai(wei, pos, index){
            switch (wei) {
                case mjconst.ME:
                    this.model.scale.set(sm1, sm1, sm1)
                    this.model.rotation.set(0, 0, 0)
                    this.model.position.set(pos, 0, 0)
                    pos += pw1
                    break  
                case mjconst.RIGHT:
                    this.model.scale.set(sm2, sm2, sm2)
                    this.model.rotation.set(0, Math.PI, Math.PI/2) 
                    if(index == 3){
                        pos -= pw2
                        this.model.position.set(-ph2, pos, sm2*20.1)
                    }else{
                        this.model.position.set(0, pos, sm2*20.1)
                    }
                    pos += pw2
                    break
                case mjconst.OPPOSITE:
                    this.model.scale.set(sm2, sm2, sm2)
                    this.model.rotation.set(0, Math.PI, Math.PI) 
                    this.model.position.set(pos, 0, sm2*20.1)
                    pos -= pw2
                    break  
                case mjconst.LEFT:
                    this.model.scale.set(sm2, sm2, sm2)
                    this.model.rotation.set(0, Math.PI, -Math.PI/2)
                    if(index == 3){
                        pos += pw2
                        this.model.position.set(ph2, pos, sm2*20.1)
                    }else{
                        this.model.position.set(0, pos, sm2*20.1)
                    }
                    pos -= pw2
                    break
            }
            mjpaizhuo.mopaiqu[wei].add(this.model)
            return pos
        }

        dispose(){
            this.model.visible = false 
            this.model.traverse(function(obj) {
                if (obj.type === 'Mesh') {
                obj.geometry.dispose();
                obj.material.dispose();
                }
            })
            // 删除场景对象scene的子对象group
            mjgraph.getScene().remove(this.model)  
        }

        toggleHilight(){
            if (! this.selected){
                this.model.translateY(15)
                this.selected = true
            }else{
                this.model.translateY(-15)
                this.selected = false
            }
        }

        cancelHilight(){
            if (this.selected){
                this.model.translateY(-15)
                this.selected = false
            }
        }

    }

    //画牌长方体， 40x30x20
    function drawPai() {
        // create a basic shape
        var shape = new THREE.Shape();

        // startpoint
        shape.moveTo(12, 20);

        // curve at the bottom
        shape.quadraticCurveTo(15, 20, 15, 17);    

        shape.lineTo(15, -17)

        // the top of the figure, curve to the right
        shape.quadraticCurveTo(15, -20, 12, -20);            

        // straight line upwards
        shape.lineTo(-12, -20);

            // the top of the figure, curve to the right
        shape.quadraticCurveTo(-15, -20, -15, -17);

        // curve at the bottom
        shape.lineTo(-15, 17);

        // curve at the bottom
        shape.quadraticCurveTo(-15, 20, -12, 20);  

        shape.lineTo(12, 20)

        // return the shape
        return shape;
    }     
    //画牌面， 34x24 以便贴图
    function drawPaimian() {
        // create a basic shape
        var shape = mjgraph.rectShape(24,34)
        return shape;
    }


    return {Pai, init, ready, onReady};
});
