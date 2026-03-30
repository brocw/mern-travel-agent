import { useState } from "react";
import { buildPath } from "./Path";
import { storeToken } from "../tokenStorage";
import { jwtDecode } from "jwt-decode";
import type { JwtPayload } from "jwt-decode";

interface MyJwtPayload extends JwtPayload {
  firstName: string;
  lastName: string;
  userId: number;
}

function Register() {
  const [message, setMessage] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function doRegister(event: any): Promise<void> {
    event.preventDefault();

    var obj = {
      firstName: firstName,
      lastName: lastName,
      login: username,
      email: email,
      password: password,
    };
    var js = JSON.stringify(obj);

    try {
      const response = await fetch(buildPath("api/register"), {
        method: "POST",
        body: js,
        headers: { "Content-Type": "application/json" },
      });

      var res = JSON.parse(await response.text());

      if (res.error) {
        setMessage(res.error);
        return;
      }

      const { accessToken } = res;
      storeToken(res);

      const decoded = jwtDecode(accessToken) as MyJwtPayload;

      try {
        var ud = decoded;
        var userId = ud.userId;
        var fn = ud.firstName;
        var ln = ud.lastName;

        console.log(fn);
        console.log(ln);

        if (!userId || userId <= 0) {
          setMessage("Registration failed.");
        } else {
          var user = { firstName: fn, lastName: ln, id: userId };
          localStorage.setItem("user_data", JSON.stringify(user));

          setMessage("");
          window.location.href = "/cards";
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

  return (
    <div id="registerDiv">
      <span id="inner-title">CREATE ACCOUNT</span>
      <br />
      <input
        type="text"
        id="firstName"
        placeholder="First Name"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
      />
      <br />
      <input
        type="text"
        id="lastName"
        placeholder="Last Name"
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
      />
      <br />
      <input
        type="text"
        id="username"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <br />
      <input
        type="email"
        id="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <br />
      <input
        type="password"
        id="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <br />
      <input
        type="submit"
        id="registerButton"
        className="buttons"
        value="Register"
        onClick={doRegister}
      />
      <span id="registerResult">{message}</span>
    </div>
  );
}

export default Register;
