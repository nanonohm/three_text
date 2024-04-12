import * as THREE from 'three';
// import { pointInPolygon } from 'point-in-polygon'
import Delaunator from 'delaunator';
import { lon2xyz } from './math.js'
// 几何体辅助合并工具
import { mergeBufferGeometries } from '../../node_modules/three/examples/jsm/utils/BufferGeometryUtils';

var pointInPolygon = require('point-in-polygon')

function gridPoint(polygon) {
  var lonArr = [];
  var latArr = [];
  polygon.forEach(elem => {
    lonArr.push(elem[0])
    latArr.push(elem[1])
  });

  var [lonMin, lonMax] = minMax(lonArr);
  var [latMin, latMax] = minMax(latArr);

  var interval = 3;
  var row = Math.ceil((lonMax - lonMin) / interval);
  var col = Math.ceil((latMax - latMin) / interval)
  var rectPointsArr = [];
  for (var i = 0; i < row + 1; i++) {
    for (var j = 0; j < col + 1; j++) {
      rectPointsArr.push([lonMin + i * interval, latMin + j * interval])
    }
  }
  var polygonPointsArr = [];
  rectPointsArr.forEach(function (coord) {
    if (pointInPolygon(coord, polygon)) {
      polygonPointsArr.push(coord)
    }
  })
  return [...polygon, ...polygonPointsArr];
}

//   经纬度坐标进行排序 返回最小值和最大值
function minMax(arr) {
  arr.sort(compareNum);
  return [Math.floor(arr[0]), Math.ceil(arr[arr.length - 1])]
}
// 数组排序规则
function compareNum(num1, num2) {
  if (num1 < num2) {
    return -1;
  } else if (num1 > num2) {
    return 1;
  } else {
    return 0;
  }
}

// 三角剖分
function delaunay(pointsArr, polygon) {
  var indexArr = Delaunator.from(pointsArr).triangles;

  var usefulIndexArr = [];
  for (var i = 0; i < indexArr.length; i += 3) {
    var p1 = pointsArr[indexArr[i]];
    var p2 = pointsArr[indexArr[i + 1]];
    var p3 = pointsArr[indexArr[i + 2]];
    // 三角形重心坐标计算
    var point = [(p1[0] + p2[0] + p3[0]) / 3, (p1[1] + p2[1] + p3[1]) / 3];
    if (pointInPolygon(point, polygon)) {
      // 有一点需要注意，一个三角形索引逆时针和顺时针顺序对应three.js三角形法线方向相反，或者说Mesh正面、背面方向不同
      usefulIndexArr.push(indexArr[i + 2], indexArr[i + 1], indexArr[i]);
    }
  }
  return usefulIndexArr
}

// 渲染一个国家的球面轮廓Mesh
function countryMesh(R, polygonArr) {
  var geometryArr = [];
  polygonArr.forEach(obj => {
    var polygon = obj[0];

    //生成点集
    var pointsArr = gridPoint(polygon);
    // 三角剖分生成顶点坐标对应三角形索引
    var trianglesIndexArr = delaunay(pointsArr, polygon)
    //经纬度坐标转化为球面坐标
    var spherePointsArr = [];
    pointsArr.forEach((item, i) => {
      var pos = lon2xyz(R, item[0], item[1])
      spherePointsArr.push(pos.x, pos.y, pos.z)
    });
    var geometry = new THREE.BufferGeometry();//创建一个几何体
    // 设置几何体顶点索引
    geometry.index = new THREE.BufferAttribute(new Uint16Array(trianglesIndexArr), 1)
    // 设置几何体顶点位置坐标
    geometry.attributes.position = new THREE.BufferAttribute(new Float32Array(spherePointsArr), 3)
    geometryArr.push(geometry);
  });
  // 合并几何体
  var newGeometry = null;
  if (geometryArr.length == 1) {
    newGeometry = geometryArr[0];
  } else {
    newGeometry = mergeBufferGeometries(geometryArr);
  }

  var pointsMaterial = new THREE.PointsMaterial({
    color: 0x1cfb05,
    size: 1,
  });//点材质
  var points = new THREE.Points(newGeometry, pointsMaterial);// 点模型

  newGeometry.computeVertexNormals();//如果使用受光照影响材质，需要计算生成法线
  // MeshLambertMaterial   MeshBasicMaterial
  var material = new THREE.MeshLambertMaterial({
    color: 0x5f6aa9,
    transparent: true,
    opacity: 0.3
    // side: THREE.BackSide, //背面可见，默认正面可见   THREE.DoubleSide：双面可见
  })
  var mesh = new THREE.Mesh(newGeometry, material)

  // 渲染三角形线框
  var mesh2 = mesh.clone();
  mesh2.material = new THREE.MeshBasicMaterial({
    color: 0x2772f2,
    wireframe: true,
  })
  // mesh.add(points)
  // mesh.add(mesh2)
  return mesh
}

export { countryMesh };