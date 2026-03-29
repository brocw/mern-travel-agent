import { useState, useEffect } from 'react';

function LoggedInName() {
  const [userName, setUserName] = useState('User');

  useEffect(() => {
    const userData = localStorage.getItem('user_data');
    if (userData) {
      const user = JSON.parse(userData);
      setUserName(`${user.firstName} ${user.lastName}`);
    }
  }, []);

  function doLogout(event: any): void {
    event.preventDefault();
    localStorage.removeItem("user_data");
    localStorage.removeItem("token_data");
    window.location.href = '/';
  };

  return (
    <div id="loggedInDiv">
      <span id="userName">Logged In As {userName}</span>
      <span style={{ marginLeft: '20px' }}>
        <a href="/search" style={{ marginRight: '15px' }}>Search</a>
        <a href="/trips" style={{ marginRight: '15px' }}>My Trips</a>
      </span>
      <button type="button" id="logoutButton" className="buttons"
        onClick={doLogout}> Log Out </button>
    </div>
  );
};
export default LoggedInName;
