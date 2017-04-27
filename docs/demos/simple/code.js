var a = 10;
a = 5 + 9;
a -= 9;

var sth = [];
sth = [1, 2, 3];

function square(n) {
  return n * n;
}

function getVal(n) {
  return n + 1;
}
var val = getVal(10);

b =
  "Helllo" +
  "\n\n\nWorld+ adsfjaklsdfhjkasjkfhkjadshf lhsdkjlfadklsjhflkdsjhfkjdshkjlfhsdlkjafhdsh\nssss";

square(1);
square(2);
square(3);

function one() {
  return function two() {
    return {
      x: 10
    };
  };
}

var xx = one()().x;

var a = null;

function setA(val) {
  a = val;
}

setA({
  one: 1,
  two: 2,
  three: {
    more: "info",
    on: "stuff",
    etc: {}
  }
});

setA({
  one: 199,
  two: 2223,
  three: {
    more: "asdf",
    on: "fds",
    etc: {}
  }
});

// var a = {
//     a: /a-z/g,
//     p: new Promise(function(){}),
//     f: function(){
//         var a = 5;

//         a++
//         a++
//         a++
//         a++
//         a++
//         a++
//         a++
//         a++
//         a++
//         a++
//         a++
//         a++
//         a++
//         a++
//         a++
//         a++
//         a++
//         a++
//         a++
//         a++
//         a++
//         a++
//         a++
//         a++
//         a++
//         a++
//         a++
//     }
// }

// function callTwice(cb){
//     cb()
//     cb()
// }

// callTwice(function(){
//     console.log("test")
// })

// function oo(){
//     return {
//         a: 1,
//         b: 2,
//         c: {
//             d: 3
//         }
//     }
// }

// oo()

// function add(a, b){
//     return a + b
// }

// add(1, 2)
// add("a", 1)

// function getFullName(person){
//     return person.firstName + person.lastName
// }

// getFullName({
//     firstName: "John",
//     lastName: "Smith"
// })

// getFullName({
//     firstName: "Mary",
//     lastName: "Smith",
//     age: 44
// })

// function getArray(){
//     return [3, 4]
// }

// var arr = getArray()
// arr = arr.map(function(number){
//     return number * number
// })
