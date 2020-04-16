const esprima = require("esprima"); //JS语法树模块
const estraverse = require("estraverse"); //JS语法树遍历各节点
const escodegen = require("escodegen"); //JS语法树反编译模块

const fs = require("fs-extra");
const path = require("path");

const fileUrl = path.resolve(__dirname, "../js/demo.js");

let cacheNode = null; // type为ExpressionStatement时，缓存它的父节点node节点

let isConsole = false;
let isLog = false;

function modifyAST(data) {
  const ast = esprima.parseScript(data); // 解析成AST
  estraverse.traverse(ast, {
    enter: function (node, parentNode) {
      console.log(node);
      console.log("---------enter---------");
      delConsole.call(this, node, parentNode); //删除console.log
      setParseInt(node); //把 parseInt(a) 改为 parseInt(a,10)
    },
    leave: function (node) {
      console.log("--------leave-------");
      console.log(node);
    },
  });

  const code = escodegen.generate(ast);
  return code;
}

function delConsole(node, parentNode) {
  if (isConsole && isLog) {
    isConsole = false;
    isLog = false;
    const delIndex = cacheNode.body
      .map((item, index) => {
        if (item.type === "ExpressionStatement") {
          if (item.expression && item.expression.type === "CallExpression") {
            const callee = item.expression.callee;
            if (callee && callee.object && callee.property) {
              if (
                callee.object.name === "console" &&
                callee.property.name === "log"
              ) {
                return index;
              }
            }
          }
        }
        return null;
      })
      .filter((item) => item !== null);
    delIndex.forEach((delIndex) => {
      cacheNode.body.splice(delIndex, 1);
    });
  }
  if (node.type === "ExpressionStatement") {
    cacheNode = parentNode;
  }
  if (node.name === "console") {
    isConsole = true;
  }
  if (node.name === "log") {
    isLog = true;
  }
}

function setParseInt(node) {
  //判断节点类型，方法名称，方法的参数的数量，数量为1就增加第二个参数
  if (
    node.type === "CallExpression" &&
    node.callee.name === "parseInt" &&
    node.arguments.length === 1
  ) {
    node.arguments.push({
      //增加参数，其实就是数组操作
      type: "Literal",
      value: 10,
      raw: "10",
    });
  }
}

async function readAoutput(f) {
  try {
    const data = await fs.readFile(f, "utf8");
    const mData = modifyAST(data);
    await fs.outputFile(f, mData);

    console.log(mData);
  } catch (err) {
    console.error(err);
  }
}

readAoutput(fileUrl);
