import React, { useEffect, useRef } from 'react'
import * as THREE from 'three';
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import './index.css'
import { earth } from './Earth'
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { arcXOY, startEndQuaternion } from './countryFlyLine'
import config from '../config/config'
import { flyArcGroup, flyArr } from './countryFlyLine'


var R = config.R;//地球半径

function Scene() {
  const threeRef = useRef()

  useEffect(() => {
    startThree()
  }, [])


  const startThree = () => {
    /**
    * 创建场景对象Scene
    */
    const scene = new THREE.Scene();  //创建场景

    const container = threeRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    /**
    * 相机设置
    */
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
    camera.position.set(200, 200, 200);
    camera.lookAt(0, 0, 0); //相机指向Three.js坐标系原点

    const axisHelper = new THREE.AxesHelper(200)
    scene.add(axisHelper)

    // 平行光1
    var directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(500, 500, 500);
    scene.add(directionalLight);
    // 平行光2
    var directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight2.position.set(-500, -500, -500);
    scene.add(directionalLight2);
    //环境光
    var ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);

    const renderer = new THREE.WebGLRenderer({
      antialias: true, //开启锯齿
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);//设置设备像素比率,防止Canvas画布输出模糊。
    // renderer.setClearColor('#af3', .5) //背景颜色
    container.appendChild(renderer.domElement); //生成的渲染的实例, 这个要放到对应的dom容器里面

    renderer.render(scene, camera); //执行渲染操作

    //创建控件对象  控件可以监听鼠标的变化，改变相机对象的属性
    // 旋转：拖动鼠标左键
    // 缩放：滚动鼠标中键
    // 平移：拖动鼠标右键
    const os = new OrbitControls(camera, container)
    // const controls = new OrbitControls(camera, container);
    // controls.enableZoom = false;  //禁用缩放
    // controls.enableRotate = false;  //禁用旋转
    // controls.enablePan = false;  //禁用平移
    // controls.update();

    // 创建一个HTML标签
    const tag = () => {
      // 创建div元素
      var div = document.createElement('div');
      div.style.visibility = 'hidden';
      div.style.padding = '4px 10px';
      div.innerHTML = '';
      div.style.color = '#fff';
      div.style.fontSize = '16px';
      div.style.position = 'absolute';
      div.style.backgroundColor = 'rgba(25,25,25,0.5)';
      div.style.borderRadius = '5px';
      var label = new CSS2DObject(div);
      div.style.pointerEvents = 'none';//避免HTML标签遮挡三维场景的鼠标事件
      return label;
    }

    var label = tag();
    earth.add(label);//标签插入earth中

    // 创建一个CSS2渲染器CSS2DRenderer
    var labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(width, height);
    labelRenderer.domElement.style.position = 'absolute';
    // // 相对鼠标单击位置偏移
    labelRenderer.domElement.style.top = '-16px';
    labelRenderer.domElement.style.left = '0px';
    // //设置.pointerEvents=none，以免模型标签HTML元素遮挡鼠标选择场景模型
    labelRenderer.domElement.style.pointerEvents = 'none';
    container.appendChild(labelRenderer.domElement);

    var chooseMesh = null
    const chooseCountry = (event) => {
      if (chooseMesh) {
        // 把上次选中的mesh设置为原来的颜色
        // chooseMesh.material.color.set(0x5f6aa9);
        chooseMesh.material.opacity = 0.3
        label.element.style.visibility = 'hidden';//隐藏标签
      }
      var Sx = event.clientX;
      var Sy = event.clientY;
      //屏幕坐标转WebGL标准设备坐标
      var x = (Sx / window.innerWidth) * 2 - 1;
      var y = -(Sy / window.innerHeight) * 2 + 1;

      var raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
      //选中的网格模型对象
      var intersects = raycaster.intersectObjects(earth.meshArr);
      if (intersects.length > 0) {
        chooseMesh = intersects[0].object;
        // chooseMesh.material.color.set(0x3c61ff);//选中改变颜色
        chooseMesh.material.opacity = 1
        label.position.copy(intersects[0].point);
        label.element.innerHTML = chooseMesh.name;
        label.element.style.visibility = 'visible';
      }
    }

    window.addEventListener('mousemove', chooseCountry);

    earth.add(flyArcGroup);
    scene.add(earth)

    const animate = function () {
      // 批量设置所有飞线的运动动画
      flyArr.forEach((fly) => {
        fly.rotation.z += 0.02; //调节飞线速度
        if (fly.rotation.z >= fly.flyEndAngle) fly.rotation.z = fly.startAngle;
      });

      requestAnimationFrame(animate);
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera); //渲染HTML标签对象
    };
    animate();
  }

  return (
    // <div className={'box'}>
    <div ref={threeRef} style={{ height: '100vh', width: '100vw' }}></div>
    // </div>
  )
}
export default Scene;
