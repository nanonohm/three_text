import config from '../config/config'
// 引入three.js
import * as THREE from 'three';
import { lon2xyz } from './math.js'
import data from '../asset/data/flyData'
var R = config.R;//地球半径
function arcXOY(startPoint, endPoint) {
  var middleV3 = new THREE.Vector3().addVectors(startPoint, endPoint).multiplyScalar(0.5);
  var dir = middleV3.clone().normalize()
  var earthRadianAngle = radianAOB(startPoint, endPoint, new THREE.Vector3(0, 0, 0))
  var arcTopCoord = dir.multiplyScalar(R + earthRadianAngle * R * 0.2)

  var flyArcCenter = threePointCenter(startPoint, endPoint, arcTopCoord)
  var flyArcR = Math.abs(flyArcCenter.y - arcTopCoord.y);

  var flyRadianAngle = radianAOB(startPoint, new THREE.Vector3(0, -1, 0), flyArcCenter);
  var startAngle = -Math.PI / 2 + flyRadianAngle;
  var endAngle = Math.PI - startAngle;

  var arcline = circleLine(flyArcCenter.x, flyArcCenter.y, flyArcR, startAngle, endAngle)
  arcline.center = flyArcCenter;//飞线圆弧自定一个属性表示飞线圆弧的圆心
  arcline.topCoord = arcTopCoord;//飞线圆弧自定一个属性表示飞线圆弧中间也就是顶部坐标

  // var flyAngle = Math.PI/ 10; //飞线圆弧固定弧度
  var flyAngle = (endAngle - startAngle) / 7; //飞线圆弧的弧度和轨迹线弧度相关
  // 绘制一段飞线，圆心做坐标原点
  var flyLine = createFlyLine(flyArcR, startAngle, startAngle + flyAngle);
  flyLine.position.y = flyArcCenter.y;//平移飞线圆弧和飞线轨迹圆弧重合
  //飞线段flyLine作为飞线轨迹arcLine子对象，继承飞线轨迹平移旋转等变换
  arcline.add(flyLine);
  //飞线段运动范围startAngle~flyEndAngle
  flyLine.flyEndAngle = endAngle - startAngle - flyAngle;
  flyLine.startAngle = startAngle;
  // arcline.flyEndAngle：飞线段当前角度位置，这里设置了一个随机值用于演示
  flyLine.AngleZ = arcline.flyEndAngle * Math.random();
  // flyLine.rotation.z = arcline.AngleZ;
  // arcline.flyLine指向飞线段,便于设置动画是访问飞线段
  arcline.flyLine = flyLine;
  return arcline
}
/*计算球面上两点和球心构成夹角的弧度值
参数point1, point2:表示地球球面上两点坐标Vector3
计算A、B两点和顶点O构成的AOB夹角弧度值*/
function radianAOB(A, B, O) {
  var dir1 = A.clone().sub(O).normalize();
  var dir2 = B.clone().sub(O).normalize();
  var cosAngle = dir1.clone().dot(dir2);
  var radianAngle = Math.acos(cosAngle);
  return radianAngle
}

function circleLine(x, y, r, startAngle, endAngle) {
  var geometry = new THREE.BufferGeometry();
  var arc = new THREE.ArcCurve(x, y, r, startAngle, endAngle, false);
  var points = arc.getSpacedPoints(50);
  geometry.setFromPoints(points);
  var material = new THREE.LineBasicMaterial({ color: 0xffffff, });
  var line = new THREE.Line(geometry, material);
  return line;
}
//求三个点的外接圆圆心，p1, p2, p3表示三个点的坐标Vector3。
function threePointCenter(p1, p2, p3) {
  var L1 = p1.lengthSq();//p1到坐标原点距离的平方
  var L2 = p2.lengthSq();
  var L3 = p3.lengthSq();
  var x1 = p1.x, y1 = p1.y, x2 = p2.x, y2 = p2.y, x3 = p3.x, y3 = p3.y;
  var S = x1 * y2 + x2 * y3 + x3 * y1 - x1 * y3 - x2 * y1 - x3 * y2;
  var x = (L2 * y3 + L1 * y2 + L3 * y1 - L2 * y1 - L3 * y2 - L1 * y3) / S / 2;
  var y = (L3 * x2 + L2 * x1 + L1 * x3 - L1 * x2 - L2 * x3 - L3 * x1) / S / 2;
  // 三点外接圆圆心坐标
  var center = new THREE.Vector3(x, y, 0);
  return center
}

function _3Dto2D(startSphere, endSphere) {
  /*计算第一次旋转的四元数：表示从一个平面如何旋转到另一个平面*/
  var origin = new THREE.Vector3(0, 0, 0);//球心坐标
  var startDir = startSphere.clone().sub(origin);//飞线起点与球心构成方向向量
  var endDir = endSphere.clone().sub(origin);//飞线结束点与球心构成方向向量
  // dir1和dir2构成一个三角形，.cross()叉乘计算该三角形法线normal
  var normal = startDir.clone().cross(endDir).normalize();
  var xoyNormal = new THREE.Vector3(0, 0, 1);//XOY平面的法线
  //.setFromUnitVectors()计算从normal向量旋转达到xoyNormal向量所需要的四元数
  // quaternion表示把球面飞线旋转到XOY平面上需要的四元数
  var quaternion3D_XOY = new THREE.Quaternion().setFromUnitVectors(normal, xoyNormal);
  /*第一次旋转：飞线起点、结束点从3D空间第一次旋转到XOY平面*/
  var startSphereXOY = startSphere.clone().applyQuaternion(quaternion3D_XOY);
  var endSphereXOY = endSphere.clone().applyQuaternion(quaternion3D_XOY);

  /*计算第二次旋转的四元数*/
  // middleV3：startSphereXOY和endSphereXOY的中点
  var middleV3 = startSphereXOY.clone().add(endSphereXOY).multiplyScalar(0.5);
  var midDir = middleV3.clone().sub(origin).normalize();// 旋转前向量midDir，中点middleV3和球心构成的方向向量
  var yDir = new THREE.Vector3(0, 1, 0);// 旋转后向量yDir，即y轴
  // .setFromUnitVectors()计算从midDir向量旋转达到yDir向量所需要的四元数
  // quaternion2表示让第一次旋转到XOY平面的起点和结束点关于y轴对称需要的四元数
  var quaternionXOY_Y = new THREE.Quaternion().setFromUnitVectors(midDir, yDir);

  /*第二次旋转：使旋转到XOY平面的点再次旋转，实现关于Y轴对称*/
  var startSpherXOY_Y = startSphereXOY.clone().applyQuaternion(quaternionXOY_Y);
  var endSphereXOY_Y = endSphereXOY.clone().applyQuaternion(quaternionXOY_Y);

  /**一个四元数表示一个旋转过程
  *.invert()方法表示四元数的逆，简单说就是把旋转过程倒过来
  * 两次旋转的四元数执行.invert()求逆，然后执行.multiply()相乘
  *新版本.invert()对应旧版本.invert()
  */
  var quaternionInverse = quaternion3D_XOY.clone().invert().multiply(quaternionXOY_Y.clone().invert())
  return {
    // 返回两次旋转四元数的逆四元数
    quaternion: quaternionInverse,
    // 范围两次旋转后在XOY平面上关于y轴对称的圆弧起点和结束点坐标
    startPoint: startSpherXOY_Y,
    endPoint: endSphereXOY_Y,
  }
}

function flyArc(lon1, lat1, lon2, lat2) {
  var sphereCoord1 = lon2xyz(R, lon1, lat1);//经纬度坐标转球面坐标
  // startSphereCoord：轨迹线起点球面坐标
  var startSphereCoord = new THREE.Vector3(sphereCoord1.x, sphereCoord1.y, sphereCoord1.z);
  var sphereCoord2 = lon2xyz(R, lon2, lat2);
  // startSphereCoord：轨迹线结束点球面坐标
  var endSphereCoord = new THREE.Vector3(sphereCoord2.x, sphereCoord2.y, sphereCoord2.z);

  //计算绘制圆弧需要的关于y轴对称的起点、结束点和旋转四元数
  var startEndQua = _3Dto2D(startSphereCoord, endSphereCoord)
  // 调用arcXOY函数绘制一条圆弧飞线轨迹
  var arcline = arcXOY(startEndQua.startPoint, startEndQua.endPoint);
  arcline.quaternion.multiply(startEndQua.quaternion)
  return arcline;
}

/*绘制一条圆弧飞线
5个参数含义：( 飞线圆弧轨迹半径, 开始角度, 结束角度)*/
function createFlyLine(r, startAngle, endAngle) {
  var geometry = new THREE.BufferGeometry(); //声明一个几何体对象BufferGeometry
  // THREE.ArcCurve创建圆弧曲线
  var arc = new THREE.ArcCurve(0, 0, r, startAngle, endAngle, false);
  //getSpacedPoints是基类Curve的方法，返回一个vector2对象作为元素组成的数组
  var pointsArr = arc.getSpacedPoints(50); //分段数50，返回51个顶点
  geometry.setFromPoints(pointsArr);// setFromPoints方法从pointsArr中提取数据改变几何体的顶点属性vertices
  // 每个顶点对应一个百分比数据attributes.percent 用于控制点的渲染大小
  var percentArr = []; //attributes.percent的数据
  for (var i = 0; i < pointsArr.length; i++) {
    percentArr.push(i / pointsArr.length);
  }
  var percentAttribue = new THREE.BufferAttribute(new Float32Array(percentArr), 1);
  // 通过顶点数据percent点模型从大到小变化，产生小蝌蚪形状飞线
  geometry.attributes.percent = percentAttribue;
  // 批量计算所有顶点颜色数据
  var colorArr = [];
  for (var i = 0; i < pointsArr.length; i++) {
    var color1 = new THREE.Color(0xffffff); //青色
    var color2 = new THREE.Color(0xffff00); //黄色
    var color = color1.lerp(color2, i / pointsArr.length)
    colorArr.push(color.r, color.g, color.b);
  }
  // 设置几何体顶点颜色数据
  geometry.attributes.color = new THREE.BufferAttribute(new Float32Array(colorArr), 3);
  // 点模型渲染几何体每个顶点
  var material = new THREE.PointsMaterial({
    size: 3.0, //点大小
    vertexColors: THREE.VertexColors, //使用顶点颜色渲染
  });
  // 修改点材质的着色器源码(注意：不同版本细节可能会稍微会有区别，不过整体思路是一样的)
  // material.onBeforeCompile = function (shader) {
  //   // 顶点着色器中声明一个attribute变量:百分比
  //   shader.vertexShader = shader.vertexShader.replace(
  //     'void main() {',
  //     [
  //       'attribute float percent;', //顶点大小百分比变量，控制点渲染大小
  //       'void main() {',
  //     ].join('\n') // .join()把数组元素合成字符串
  //   );
  //   // 调整点渲染大小计算方式
  //   shader.vertexShader = shader.vertexShader.replace(
  //     'gl_PointSize = size;',
  //     [
  //       'gl_PointSize = percent * size;',
  //     ].join('\n') // .join()把数组元素合成字符串
  //   );
  // };
  var FlyLine = new THREE.Points(geometry, material);
  return FlyLine;
}

var flyArcGroup = new THREE.Group();
var flyArr = [];//所有飞线的集合，用来在渲染循环中设置飞线动画
var WaveMeshArr = [];//所有波动光圈集合
Object.keys(data).map(item => {
  data[item].end.forEach((coord) => {
    /*调用函数flyArc绘制球面上任意两点之间飞线圆弧轨迹*/
    var arcline = flyArc(data[item].start.E, data[item].start.N, coord.E, coord.N)
    flyArcGroup.add(arcline); //飞线插入flyArcGroup中
    flyArr.push(arcline.flyLine);//获取飞线段
  });
})

export { flyArcGroup, flyArr }