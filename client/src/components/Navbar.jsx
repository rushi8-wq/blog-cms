import { Link, NavLink } from "react-router-dom";

export default function Navbar() {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand" to="/" aria-label="Fieldnotes home">
          <span className="brand-mark" aria-hidden="true">f.</span>
          <span>fieldnotes</span>
        </Link>
        <nav className="main-nav" aria-label="Main navigation">
          <NavLink to="/" end>Stories</NavLink>
          <Link className="nav-write" to="/create">Write a story <span aria-hidden="true">↗</span></Link>
        </nav>
      </div>
    </header>
  );
}
