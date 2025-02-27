import { useState, useEffect } from "react";

function App() {
  const [players, setPlayers] = useState([]);
  const [newPlayer, setNewPlayer] = useState("");
  const [caller, setCaller] = useState("");
  const [dealer, setDealer] = useState("");
  const [companion, setCompanion] = useState("");
  const [fuoripuntoPlayer, setFuoripuntoPlayer] = useState("");
  const [score, setScore] = useState("");
  const [double, setDouble] = useState(false);
  const [noPoints, setNoPoints] = useState(false);
  const [underPoint, setUnderPoint] = useState(false);
  const [results, setResults] = useState({});
  const [totale, setTotale] = useState({});
  const [matchHistory, setMatchHistory] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState("players");
  const [previousPage, setPreviousPage] = useState(null);
  const [callerWon, setCallerWon] = useState(true);

  // Aggiorna le statistiche (solo per i round in cui il giocatore ha partecipato)
  useEffect(() => {
    const stats = {};
    matchHistory.forEach((round) => {
      round.activePlayers.forEach((player) => {
        if (!stats[player]) {
          stats[player] = { rounds: 0, vincite: 0, sconfitte: 0 };
        }
        stats[player].rounds += 1;
        const points = round.results[player];
        if (points > 0) stats[player].vincite += 1;
        else if (points < 0) stats[player].sconfitte += 1;
      });
    });
    players.forEach((player) => {
      if (!stats[player]) stats[player] = { rounds: 0, vincite: 0, sconfitte: 0 };
    });
    setStatistics(stats);
  }, [matchHistory, players]);

  // Carica/salva i giocatori nel localStorage
  useEffect(() => {
    const savedPlayers = localStorage.getItem("players");
    if (savedPlayers) {
      setPlayers(JSON.parse(savedPlayers));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("players", JSON.stringify(players));
  }, [players]);

  const quotaToEuro = (points) => {
    if (points >= 81 && points <= 86) return 1;
    if (points >= 87 && points <= 90) return 1.5;
    if (points >= 91 && points <= 96) return 2;
    if (points >= 97 && points <= 100) return 2.5;
    if (points >= 101 && points <= 106) return 3;
    if (points >= 107 && points <= 110) return 3.5;
    if (points >= 111 && points <= 118) return 4;
    return 0;
  };

  const addPlayer = () => {
    if (newPlayer.trim() === "") {
      setError("Il nome del giocatore non può essere vuoto.");
      return;
    }
    if (players.length >= 7) {
      setError("Numero massimo di giocatori è 7.");
      return;
    }
    if (players.includes(newPlayer)) {
      setError("Questo giocatore è già stato aggiunto.");
      return;
    }
    setPlayers([...players, newPlayer]);
    setNewPlayer("");
    setError("");
  };

  // Se elimini un giocatore nella schermata "Giocatori", resetta il Dealer
  const removePlayer = (playerToRemove) => {
    setPlayers(players.filter((player) => player !== playerToRemove));
    if (currentPage === "players") {
      setDealer("");
    }
  };

  // Determina i giocatori attivi in base al numero totale:
  // - In 5: tutti giocano (incluso il Dealer)
  // - In 6: escludi il Dealer
  // - In 7: escludi il Dealer e il giocatore immediatamente precedente (in ordine circolare)
  const getActivePlayers = () => {
    if (players.length === 5) return players;
    else if (players.length === 6) return players.filter((player) => player !== dealer);
    else if (players.length === 7) {
      const dealerIndex = players.indexOf(dealer);
      if (dealerIndex === -1) return players;
      const excludedIndex = (dealerIndex - 1 + players.length) % players.length;
      return players.filter((player, index) => player !== dealer && index !== excludedIndex);
    }
    return players;
  };

  const startGame = () => {
    if (players.length < 5) {
      setError("Inserisci almeno 5 giocatori!");
      return;
    }
    if (players.length > 7) {
      setError("Numero massimo di giocatori è 7.");
      return;
    }
    setError("");
    setTotale((prev) => {
      const newTotale = { ...prev };
      players.forEach((player) => {
        if (!(player in newTotale)) newTotale[player] = 0;
      });
      return newTotale;
    });
    setCurrentPage("call");
  };

  const submitCall = () => {
    const scoreValue = parseInt(score);
    if (!caller || isNaN(scoreValue) || scoreValue < 81 || scoreValue > 118) {
      setError("Punteggio non valido! Deve essere tra 81 e 118.");
      return;
    }
    // Ora, in ogni caso, richiedi la selezione del Dealer (anche in 5 giocatori)
    if (!dealer) {
      setError("Seleziona il Dealer.");
      return;
    }
    if (caller === dealer) {
      setError("Il Dealer non può essere il Chiamante.");
      return;
    }
    setError("");
    setCurrentPage("inProgress");
  };

  const calculateAmount = () => {
    let multiplier = double ? 2 : 1;
    multiplier = noPoints ? multiplier * 2 : multiplier;
    return quotaToEuro(parseInt(score)) * multiplier;
  };

  const getNormalResults = () => {
    const activePlayers = getActivePlayers();
    let matchResults = {};
    players.forEach((p) => (matchResults[p] = 0));
    const amount = calculateAmount();
    matchResults[caller] = 2 * amount;
    matchResults[companion] = amount;
    activePlayers.forEach((p) => {
      if (p !== caller && p !== companion) matchResults[p] = -amount;
    });
    return matchResults;
  };

  const getLosingResults = () => {
    const activePlayers = getActivePlayers();
    let matchResults = {};
    players.forEach((p) => (matchResults[p] = 0));
    const amount = calculateAmount();
    matchResults[caller] = -2 * amount;
    matchResults[companion] = -amount;
    activePlayers.forEach((p) => {
      if (p !== caller && p !== companion) matchResults[p] = amount;
    });
    return matchResults;
  };

  // Modalità fuoripunto: il giocatore selezionato perde 4 quote per ogni altro attivo
  const getFuoripuntoResults = () => {
    const activePlayers = getActivePlayers();
    let matchResults = {};
    players.forEach((p) => (matchResults[p] = 0));
    const loss = -4 * (activePlayers.length - 1);
    activePlayers.forEach((p) => {
      if (p === fuoripuntoPlayer) matchResults[p] = loss;
      else matchResults[p] = 4;
    });
    return matchResults;
  };

  const submitCompanion = () => {
    let matchResults;
    if (underPoint) {
      // Modalità fuoripunto: deve essere selezionato un giocatore che perderà le quote
      if (!fuoripuntoPlayer) {
        setError("Seleziona il giocatore fuoripunto.");
        return;
      }
      matchResults = getFuoripuntoResults();
    } else {
      if (!companion) {
        setError("Seleziona un compagno.");
        return;
      }
      matchResults = callerWon ? getNormalResults() : getLosingResults();
    }
    setResults(matchResults);
    setTotale((prev) => {
      let newTotale = { ...prev };
      players.forEach((p) => {
        newTotale[p] = (newTotale[p] || 0) + matchResults[p];
      });
      return newTotale;
    });
    const activePlayers = getActivePlayers();
    setMatchHistory((prev) => [
      ...prev,
      {
        round: prev.length + 1,
        caller,
        companion: underPoint ? fuoripuntoPlayer : companion,
        score,
        double,
        noPoints,
        underPoint,
        outcome: underPoint ? "Fuoripunto" : (callerWon ? "Vinto" : "Perso"),
        results: matchResults,
        activePlayers,
      },
    ]);
    setCurrentPage("results");
  };

  const resetMatch = () => {
    setCaller("");
    setCompanion("");
    setFuoripuntoPlayer("");
    setScore("");
    setDouble(false);
    setNoPoints(false);
    setUnderPoint(false);
    setResults({});
    setError("");
    if (players.length >= 5 && dealer) {
      // Ruota il Dealer indipendentemente dal numero di giocatori (in 5, il Dealer gioca; in 6 e 7 non gioca)
      const currentIndex = players.indexOf(dealer);
      const newIndex = (currentIndex + 1) % players.length;
      setDealer(players[newIndex]);
    }
    setCurrentPage("call");
  };

  const goBack = () => {
    if (["total", "history", "stats"].includes(currentPage)) {
      if (previousPage) {
        setCurrentPage(previousPage);
        setPreviousPage(null);
        return;
      } else {
        setCurrentPage("results");
        return;
      }
    }
    if (currentPage === "call") setCurrentPage("players");
    else if (currentPage === "inProgress") setCurrentPage("call");
    else if (currentPage === "companion") setCurrentPage("inProgress");
    else if (currentPage === "results") setCurrentPage("companion");
  };

  const viewTotal = () => {
    setPreviousPage(currentPage);
    setCurrentPage("total");
  };

  const viewHistory = () => {
    setPreviousPage(currentPage);
    setCurrentPage("history");
  };

  const viewStats = () => {
    setPreviousPage(currentPage);
    setCurrentPage("stats");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-white p-4 font-sans">
      {/* Header */}
      <div className="w-full flex justify-between mb-4">
        {currentPage !== "players" && (
          <button onClick={goBack} className="p-3 bg-gray-700 hover:bg-gray-600 text-2xl font-bold">
            Indietro
          </button>
        )}
        <div className="flex space-x-4">
          <button onClick={viewTotal} className="p-3 bg-secondary hover:bg-blue-500 text-2xl font-bold">
            Totale
          </button>
          <button onClick={viewHistory} className="p-3 bg-secondary hover:bg-blue-500 text-2xl font-bold">
            Cronologia
          </button>
          <button onClick={viewStats} className="p-3 bg-secondary hover:bg-blue-500 text-2xl font-bold">
            Statistiche
          </button>
        </div>
      </div>

      {/* Contenuto principale */}
      <div className="flex flex-col items-center text-center w-full max-w-md p-6 bg-gray-800 rounded-lg shadow-lg">
        {currentPage === "players" && (
          <>
            <h1 className="text-5xl font-bold mb-6 text-primary">Giocatori</h1>
            {error && <p className="text-red-400 mb-4">{error}</p>}
            <div className="mb-6 w-full">
              {players.map((player, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-white text-black rounded mb-2 text-2xl">
                  <span>{player}</span>
                  <button onClick={() => removePlayer(player)} className="text-red-600 hover:text-red-800 text-2xl font-bold">
                    ×
                  </button>
                </div>
              ))}
            </div>
            <input
              type="text"
              value={newPlayer}
              onChange={(e) => setNewPlayer(e.target.value)}
              className="p-3 border border-gray-400 rounded-md text-black text-center text-2xl w-full"
              placeholder="Nome giocatore"
            />
            <button onClick={addPlayer} className="mt-4 p-3 bg-primary text-white rounded-md hover:bg-primary-dark w-full text-2xl font-bold">
              Aggiungi
            </button>
            <button onClick={startGame} className="mt-6 p-3 bg-secondary rounded-md hover:bg-blue-500 w-full text-2xl font-bold">
              Inizia Partita
            </button>
          </>
        )}

        {currentPage === "call" && (
          <>
            <h1 className="text-3xl font-bold mb-6">Chiamata</h1>
            {error && <p className="text-red-400 mb-4">{error}</p>}
            {players.length >= 5 && !dealer && (
              <select
                value={dealer}
                onChange={(e) => setDealer(e.target.value)}
                className="p-3 border border-gray-400 rounded-md text-black text-center text-2xl w-full mb-4"
              >
                <option value="">Seleziona il Dealer</option>
                {players.map((player, index) => (
                  <option key={index} value={player}>
                    {player}
                  </option>
                ))}
              </select>
            )}
            {players.length >= 5 && dealer && (
              <p className="text-xl mb-4">Dealer: {dealer}</p>
            )}
            <select
              value={caller}
              onChange={(e) => setCaller(e.target.value)}
              className="p-3 border border-gray-400 rounded-md text-black text-center text-2xl w-full mb-4"
            >
              <option value="">Seleziona il chiamante</option>
              {getActivePlayers().map((player, index) => (
                <option key={index} value={player}>
                  {player}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              className="p-3 border border-gray-400 rounded-md text-black text-center text-2xl w-full mb-4"
              placeholder="Inserisci il punteggio (81-118)"
            />
            <label className="flex items-center mb-4">
              <input type="checkbox" checked={double} onChange={() => setDouble(!double)} className="mr-2" />
              Partita Doppia
            </label>
            <button onClick={submitCall} className="mt-4 p-3 bg-blue-600 rounded-md hover:bg-blue-500 w-full text-2xl font-bold">
              Avanti
            </button>
          </>
        )}

        {currentPage === "inProgress" && (
          <>
            <h1 className="text-3xl font-bold mb-6">Partita in Corso</h1>
            <p className="text-xl mb-4">Chiamante: {caller}</p>
            <p className="text-xl mb-4">Punteggio: {score}</p>
            <p className="text-xl mb-4">{double ? "La partita è Doppia" : "La partita NON è Doppia"}</p>
            <button onClick={() => setCurrentPage("companion")} className="mt-6 p-3 bg-blue-600 rounded-md hover:bg-blue-500 w-full text-2xl font-bold">
              Seleziona il Compagno
            </button>
          </>
        )}

        {currentPage === "companion" && (
          <>
            <h1 className="text-3xl font-bold mb-6">Seleziona il Compagno</h1>
            {error && <p className="text-red-400 mb-4">{error}</p>}
            {underPoint ? (
              // Modalità fuoripunto: mostra menu per selezionare il giocatore che perderà 4 quote
              <select
                value={fuoripuntoPlayer}
                onChange={(e) => setFuoripuntoPlayer(e.target.value)}
                className="p-3 border border-gray-400 rounded-md text-black text-center text-2xl w-full mb-4"
              >
                <option value="">Seleziona il giocatore fuoripunto</option>
                {getActivePlayers().map((player, index) => (
                  <option key={index} value={player}>
                    {player}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={companion}
                onChange={(e) => setCompanion(e.target.value)}
                className="p-3 border border-gray-400 rounded-md text-black text-center text-2xl w-full mb-4"
              >
                <option value="">Seleziona il compagno</option>
                {getActivePlayers()
                  .filter((player) => player !== caller)
                  .map((player, index) => (
                    <option key={index} value={player}>
                      {player}
                    </option>
                  ))}
              </select>
            )}
            {!underPoint && (
              <div className="flex items-center justify-center space-x-4 mb-4">
                <label className="text-2xl">
                  <input type="radio" name="callerOutcome" value="win" checked={callerWon === true} onChange={() => setCallerWon(true)} className="mr-2" />
                  Vinto
                </label>
                <label className="text-2xl">
                  <input type="radio" name="callerOutcome" value="lose" checked={callerWon === false} onChange={() => setCallerWon(false)} className="mr-2" />
                  Perso
                </label>
              </div>
            )}
            {/* Checkbox "Sotto Punto" (stessa funzionalità di "Senza Punto") */}
            <label className="flex items-center mb-4">
              <input type="checkbox" checked={noPoints} onChange={() => setNoPoints(!noPoints)} className="mr-2" />
              Sotto Punto
            </label>
            <label className="flex items-center mb-4">
              <input type="checkbox" checked={underPoint} onChange={() => setUnderPoint(!underPoint)} className="mr-2" />
              Fuoripunto
            </label>
            <button onClick={submitCompanion} className="mt-4 p-3 bg-blue-600 rounded-md hover:bg-blue-500 w-full text-2xl font-bold">
              Avanti
            </button>
          </>
        )}

        {currentPage === "results" && (
          <>
            <h1 className="text-3xl font-bold mb-6">Risultati Partita</h1>
            {Object.entries(results).map(([player, amount]) => (
              <p key={player} className={`text-2xl ${amount >= 0 ? "text-green-400" : "text-red-400"}`}>
                {player}: {amount}€
              </p>
            ))}
            <h2 className="text-3xl font-bold mt-6">Totale</h2>
            {Object.entries(totale).map(([player, balance]) => (
              <p key={player} className={`text-2xl ${balance >= 0 ? "text-green-400" : "text-red-400"}`}>
                {player}: {balance}€
              </p>
            ))}
            <button onClick={resetMatch} className="mt-6 p-3 bg-red-600 rounded-md hover:bg-red-500 w-full text-2xl font-bold">
              Nuova Partita
            </button>
          </>
        )}

        {currentPage === "total" && (
          <>
            <h1 className="text-3xl font-bold mb-6">Totale</h1>
            {Object.entries(totale).length === 0 ? (
              <p className="text-xl mb-4">Nessun saldo disponibile.</p>
            ) : (
              Object.entries(totale).map(([player, balance]) => (
                <p key={player} className={`text-2xl ${balance >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {player}: {balance}€
                </p>
              ))
            )}
          </>
        )}

        {currentPage === "history" && (
          <>
            <h1 className="text-3xl font-bold mb-6">Cronologia Partite</h1>
            {matchHistory.length === 0 ? (
              <p className="text-xl mb-4">Nessun round registrato.</p>
            ) : (
              matchHistory.map((round) => (
                <p key={round.round} className="text-xl mb-2">
                  CHIAMANTE: {round.caller}{" "}
                  {round.companion ? `COMPAGNO: ${round.companion}` : "FUORIPUNTO"}{" "}
                  {round.score} {round.double ? "DOPPIA" : ""} {round.outcome.toUpperCase()}
                </p>
              ))
            )}
          </>
        )}

        {currentPage === "stats" && (
          <>
            <h1 className="text-3xl font-bold mb-6">Statistiche</h1>
            {Object.entries(statistics).length === 0 ? (
              <p className="text-xl mb-4">Nessuna statistica disponibile.</p>
            ) : (
              Object.entries(statistics).map(([player, stat]) => (
                <div key={player} className="mb-4">
                  <p className="text-xl font-bold">{player}</p>
                  <p className="text-lg">Round giocati: {stat.rounds}</p>
                  <p className="text-lg">Vittorie: {stat.vincite}</p>
                  <p className="text-lg">Sconfitte: {stat.sconfitte}</p>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App;
