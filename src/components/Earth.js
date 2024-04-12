import React, { Component, useEffect } from 'react';
import * as THREE from 'three';
// import Sprite from './Sprite.js'
// import { HotNews } from './HotNews';
import { countryMesh } from './countryMesh.js';//每个国家对应球面Mesh
import earthImg from '../asset/img/earth.png'
import earthImg2 from '../asset/img/地图.jpg'
import earthImg3 from '../asset/img/earth_1.png'
import worldjson from '../asset/data/world.json'
import spriteImg from '../asset/img/地球光圈.png'
import { lon2xyz } from './math.js'

import config from '../config/config'

var R = config.R;//地球半径
var earth = createEarth(R);// 创建地球

function createSphereMesh(r) {
  var textureLoader = new THREE.TextureLoader();
  var texture = textureLoader.load(earthImg3);
  var geometry = new THREE.SphereBufferGeometry(r, 40, 40);
  //材质对象Material
  var material = new THREE.MeshLambertMaterial({
    // color: 0x000909,
    map: texture,
    // transparent: true,
    opacity: 0.5,
  });
  var mesh = new THREE.Mesh(geometry, material);
  return mesh
}

//地球光圈
function createSprite(R) {
  var textureLoader = new THREE.TextureLoader();
  var texture = textureLoader.load(spriteImg);
  var spriteMaterial = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    // opacity: 0.5,//可以通过透明度整体调节光圈
  });
  var sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(R * 3.0, R * 3.0, 1);//适当缩放精灵
  return sprite
}

// 创建国家边界线
function countryLine(R, polygonArr) {
  var group = new THREE.Group();
  polygonArr.forEach(polygon => {
    var pointArr = [];
    polygon[0].forEach(elem => {
      var coord = lon2xyz(R, elem[0], elem[1])
      pointArr.push(coord.x, coord.y, coord.z);
    });
    group.add(line(pointArr));
  });
  return group;
}


// pointArr：行政区一个多边形轮廓边界坐标(2个元素为一组，分别表示一个顶点x、y值)
function line(pointArr) {

  var geometry = new THREE.BufferGeometry();
  //顶点
  var vertices = new Float32Array(pointArr);
  //这个类用于存储与BufferGeometry相关联的 attribute（例如顶点位置向量，面片索引，法向量，颜色值，UV坐标以及任何自定义 attribute ）。 利用 BufferAttribute，可以更高效的向GPU传递数据。
  var attribue = new THREE.BufferAttribute(vertices, 3);
  geometry.attributes.position = attribue;
  var material = new THREE.LineBasicMaterial({
    color: 0x00aaaa //线条颜色
  });
  // var line = new THREE.Line(geometry, material);
  var line = new THREE.LineLoop(geometry, material);//首尾顶点连线，轮廓闭合
  return line;
}


// 创建一个地球总对象earthGroup
function createEarth(R) {
  var earthGroup = new THREE.Group();//地球组对象
  earthGroup.add(createSphereMesh(R));

  earthGroup.add(createSprite(R));

  // earthGroup.add(HotNews);//所有新闻热点Mesh作为earth子对象

  earthGroup.meshArr = [];//自顶一个属性包含所有国家mesh，用于鼠标射线拾取

  worldjson.features.forEach(function (country) {
    if (country.geometry.type === "Polygon") {
      // 把"Polygon"和"MultiPolygon"的geometry.coordinates数据结构处理为一致
      country.geometry.coordinates = [country.geometry.coordinates];
    }
    // R * 1.001比地球R稍大，以免深度冲突
    var line = countryLine(R * 1.002, country.geometry.coordinates);//国家边界
    var mesh = countryMesh(R * 1.001, country.geometry.coordinates);//国家轮廓mesh
    earthGroup.meshArr.push(mesh);
    earthGroup.add(line);
    earthGroup.add(mesh);
    mesh.name = country.properties.name;//设置每个国家mesh对应的国家名称
  });

  return earthGroup;
}

export { earth }