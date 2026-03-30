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
    window.location.href = '/';
  };
  return (
    <div id="loggedInDiv">
      <span id="userName">Logged In As {userName} </span><br />
      <button type="button" id="logoutButton" className="buttons"
        onClick={doLogout}> Log Out </button>
    </div>
  );
};
export default LoggedInName;
