import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

import './App.css';
import ModelViewer from './Pages/ModelViewer';

function App() {
  return (
    <Router>
     
        <Routes>
          <Route path="/" element={<ModelViewer />} />
   
        </Routes>
   
    </Router>
  );
}

export default App;