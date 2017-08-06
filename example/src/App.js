import React, { Component } from 'react';
import './App.css';

function square(n){
  return n * n
}

class App extends Component {
  render() {
    return (
      <div className="App">
        <div className="App-header">
          <h2>Welcome to React</h2>
        </div>
        <p className="App-intro">
          Square of 4: {square(4)}<br/>
          Sqaure of 3: {square(3)}
        </p>
      </div>
    );
  }
}

export default App;
