import React, { useState } from "react";
import { buildPath } from "./Path";
import { storeToken } from "../tokenStorage";
import { jwtDecode } from "jwt-decode";
import type { JwtPayload } from "jwt-decode";

interface MyJwtPayload extends JwtPayload {
  firstName: string;
  lastName: string;
}

function Login() {
  const [message, setMessage] = useState("");
  const [loginName, setLoginName] = React.useState("");
  const [loginPassword, setPassword] = React.useState("");

  async function doLogin(event: any): Promise<void> {
    event.preventDefault();

    var obj = { login: loginName, password: loginPassword };
    var js = JSON.stringify(obj);

    try {
      const response = await fetch(buildPath("api/login"), {
        method: "POST",
        body: js,
        headers: { "Content-Type": "application/json" },
      });

      var res = JSON.parse(await response.text());

      const { accessToken } = res;
      storeToken(res);

      const decoded = jwtDecode(accessToken) as MyJwtPayload;

      try {
        var ud = decoded;
        var userId = ud.iat ?? -1;
        var firstName = ud.firstName;
        var lastName = ud.lastName;

        console.log(firstName);
        console.log(lastName);

        if (userId <= 0) {
          setMessage("User/Password combination incorrect.");
        } else {
          var user = { firstName: firstName, lastName: lastName, id: userId };
          localStorage.setItem("user_data", JSON.stringify(user));

          setMessage("");
          window.location.href = "/search";
        }
      } catch (e) {
        console.log(e);
        return;
      }
    } catch (error: any) {
      alert(error.toString());
      return;
    }
  }

  function handleSetLoginName(e: any): void {
    setLoginName(e.target.value);
  }

  function handleSetPassword(e: any): void {
    setPassword(e.target.value);
  }

  return (
    <div id="loginDiv">
      <span id="inner-title">PLEASE LOG IN</span>
      <br />
      <input
        type="text"
        id="loginName"
        placeholder="Username"
        onChange={handleSetLoginName}
      />
      <br />
      <input
        type="password"
        id="loginPassword"
        placeholder="Password"
        onChange={handleSetPassword}
      />
      <br />
      <input
        type="submit"
        id="loginButton"
        className="buttons"
        value="Login"
        onClick={doLogin}
      />
      <span id="loginResult">{message}</span>
      <br />
      <input
        type="button"
        id="registerButton"
        className="buttons"
        value="Register"
        onClick={() => window.location.href = "/register"}
      />
      {/* <a href="/register">Don't have an account? Register here</a> */} 
    </div>
  );
}

export default Login;
