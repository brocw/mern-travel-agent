import _React, { useState } from "react";
import { buildPath } from "./Path";
import { retrieveToken, storeToken } from "../tokenStorage";

function CardUI() {
  const [message, setMessage] = useState("");
  const [searchResults, setResults] = useState("");
  const [cardList, setCardList] = useState("");
  const [search, setSearchValue] = useState("");
  const [card, setCardNameValue] = useState("");

  var _ud: any = localStorage.getItem("user_data");
  var ud = JSON.parse(_ud);
  var userId: string = ud.id;
  // var firstName = ud.firstName;
  // var lastName = ud.lastName;

  async function addCard(e: any): Promise<void> {
    e.preventDefault();
    let obj = { userId: userId, card: card, jwtToken: retrieveToken() };
    let js = JSON.stringify(obj);
    try {
      const response = await fetch(buildPath("api/addCard"), {
        method: "POST",
        body: js,
        headers: {
          "Content-Type": "application/json",
        },
      });
      let txt = await response.text();
      let res = JSON.parse(txt);
      if (res.error.length > 0) {
        setMessage("API Error:" + res.error);
      } else {
        setMessage("Card has been added");
        storeToken(res.jwtToken);
      }
    } catch (error: any) {
      setMessage(error.toString());
    }
  }

  async function searchCard(e: any): Promise<void> {
    e.preventDefault();
    let obj = { userId: userId, search: search, jwtToken: retrieveToken() };
    let js = JSON.stringify(obj);
    try {
      const response = await fetch(buildPath("api/searchCards"), {
        method: "POST",
        body: js,
        headers: {
          "Content-Type": "application/json",
        },
      });
      let txt = await response.text();
      let res = JSON.parse(txt);
      let _results = res.results;
      let resultText = "";
      for (let i = 0; i < _results.length; i++) {
        resultText += _results[i];
        if (i < _results.length - 1) {
          resultText += ", ";
        }
      }
      setResults("Card(s) have been retrieved");
      storeToken(res.jwtToken);
      setCardList(resultText);
    } catch (error: any) {
      alert(error.toString());
      setResults(error.toString());
    }
  }

  function handleSearchTextChange(e: any): void {
    setSearchValue(e.target.value);
  }

  function handleCardTextChange(e: any): void {
    setCardNameValue(e.target.value);
  }

  return (
    <div id="cardUIDiv">
      <br />
      <input
        type="text"
        id="searchText"
        placeholder="Card To Search For"
        onChange={handleSearchTextChange}
      />
      <button
        type="button"
        id="searchCardButton"
        className="buttons"
        onClick={searchCard}
      >
        {" "}
        Search Card{" "}
      </button>
      <br />
      <span id="cardSearchResult">{searchResults}</span>
      <p id="cardList">{cardList}</p>
      <br />
      <br />
      <input
        type="text"
        id="cardText"
        placeholder="Card To Add"
        onChange={handleCardTextChange}
      />
      <button
        type="button"
        id="addCardButton"
        className="buttons"
        onClick={addCard}
      >
        {" "}
        Add Card{" "}
      </button>
      <br />
      <span id="cardAddResult">{message}</span>
    </div>
  );
}

export default CardUI;
