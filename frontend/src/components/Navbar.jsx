import './Navbar.css'

export default function Navbar({ currentPage, onNavigate, onOpenAuth, onLogout, loggedUser }) {
  return (
    <header className="navbarWrapper">
      <div className="brandLogo" onClick={() => onNavigate('landing')}>
        <div className="brandSymbol">✦</div>
        <span className="brandTitle">CampusBuddy</span>
      </div>

      <nav className="navActions">
        {currentPage === 'landing' ? (
          <>
            <button className="btnGlass" onClick={() => onOpenAuth('login')}>
              Sign In
            </button>
            <button className="btnGlass btnPrimary" onClick={() => onOpenAuth('signup')}>
              Create Account
            </button>
          </>
        ) : (
          <>
            <span className="userTag">Kia Ora, <strong>{loggedUser}</strong></span>
            <button className="btnGlass" onClick={onLogout}>
              Log Out
            </button>
          </>
        )}
      </nav>
    </header>
  )
}