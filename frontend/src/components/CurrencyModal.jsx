import { useState, useEffect } from 'react'
import { convertCurrency, getSupportedCurrencies } from '../api'
import './CurrencyModal.css'

export default function CurrencyModal({ isOpen, onClose }) {
  const [currencies, setCurrencies] = useState({})
  const [amount, setAmount] = useState('1')
  const [fromCurrency, setFromCurrency] = useState('NZD')
  const [toCurrency, setToCurrency] = useState('USD')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    getSupportedCurrencies()
      .then(setCurrencies)
      .catch((err) => setError(err.message))
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !amount || isNaN(amount)) return
    setLoading(true)
    setError('')
    convertCurrency(parseFloat(amount), fromCurrency, toCurrency)
      .then(setResult)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [isOpen, amount, fromCurrency, toCurrency])

  if (!isOpen) return null

  const currencyOptions = Object.keys(currencies)

  return (
    <div className="modalBackdrop" onClick={onClose}>
      <div className="modalDialog hubModalDialog currencyDialog" onClick={(e) => e.stopPropagation()}>
        <button className="modalCloseBtn" onClick={onClose} aria-label="Close">✕</button>

        <div className="hubModalBody">
          <div className="modalHeader">
            <h2 className="modalHeading">Currency Exchange</h2>
            <p className="modalCaption">Live rates from the European Central Bank</p>
          </div>

          <div className="currencyForm">
            <div className="inputFieldGroup">
              <label className="fieldLabel">Amount</label>
              <input
                type="number"
                className="liquidInput"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
              />
            </div>

            <div className="currencyRow">
              <div className="inputFieldGroup">
                <label className="fieldLabel">From</label>
                <select className="liquidInput communitySelect" value={fromCurrency} onChange={(e) => setFromCurrency(e.target.value)}>
                  {currencyOptions.map((code) => (
                    <option key={code} value={code}>{code} — {currencies[code]}</option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                className="currencySwapBtn"
                onClick={() => {
                  setFromCurrency(toCurrency)
                  setToCurrency(fromCurrency)
                }}
                aria-label="Swap currencies"
              >
                ⇄
              </button>

              <div className="inputFieldGroup">
                <label className="fieldLabel">To</label>
                <select className="liquidInput communitySelect" value={toCurrency} onChange={(e) => setToCurrency(e.target.value)}>
                  {currencyOptions.map((code) => (
                    <option key={code} value={code}>{code} — {currencies[code]}</option>
                  ))}
                </select>
              </div>
            </div>

            {loading && <p className="communityStatusText">Converting...</p>}
            {error && <p className="communityStatusText">{error}</p>}

            {!loading && !error && result && (
              <div className="currencyResult">
                <span className="currencyResultAmount">
                  {result.convertedAmount.toFixed(2)} {toCurrency}
                </span>
                <span className="currencyResultRate">
                  1 {fromCurrency} = {result.rate.toFixed(4)} {toCurrency} · updated {result.date}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}