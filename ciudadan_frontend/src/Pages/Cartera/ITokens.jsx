import React from 'react'
//import necesario para poder usar <link> enlaces
import { Link } from 'react-router-dom';

const ITokens = () => {
  return (
    <>
    <div>Tokens</div>
      <br />
      <div>
        <Link to="/cartera/freeboocks">Ir al catálogo</Link>
      </div>
    </>
  )
}

export default ITokens