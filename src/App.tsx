import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import './App.css';
// import ModelViewer from './Pages/ModelViewer';
import ModelViewer2 from './Pages/ModelViewer2';

function App() {
  return (
    <Router>
     
        <Routes>
          <Route path="/" element={<ModelViewer2 />} />
          {/* <Route path="/sample" element={<ModelViewer2 />} /> */}
   
        </Routes>
   
    </Router>
  );
}

export default App;