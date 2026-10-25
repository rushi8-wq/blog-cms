import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import BlogDetails from "./pages/BlogDetails.jsx";
import CreateBlog from "./pages/CreateBlog.jsx";
import EditBlog from "./pages/EditBlog.jsx";
import Home from "./pages/Home.jsx";
import NotFound from "./pages/NotFound.jsx";

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="app">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<CreateBlog />} />
          <Route path="/blogs/:id" element={<BlogDetails />} />
          <Route path="/blogs/:id/edit" element={<EditBlog />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <footer className="site-footer">
          <div className="footer-inner">
            <Link className="brand footer-brand" to="/"><span className="brand-mark" aria-hidden="true">f.</span><span>fieldnotes</span></Link>
            <p>A little space for good ideas.</p>
            <span>Made for curious minds <span aria-hidden="true">✳</span></span>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}
