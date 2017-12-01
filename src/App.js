import React, { Component } from 'react';
import fetch from 'node-fetch';
import { DateRange } from 'react-date-range';
import { format } from 'd3-format'
import moment from 'moment';
import { ChartCanvas, Chart } from 'react-stockcharts';
import { CandlestickSeries, LineSeries } from "react-stockcharts/lib/series";
import { XAxis, YAxis } from 'react-stockcharts/lib/axes';
import { CurrentCoordinate, MouseCoordinateY } from 'react-stockcharts/lib/coordinates';
import { discontinuousTimeScaleProvider } from 'react-stockcharts/lib/scale';
import { OHLCTooltip, MovingAverageTooltip } from 'react-stockcharts/lib/tooltip';
import { sma } from 'react-stockcharts/lib/indicator';
import { fitWidth } from 'react-stockcharts/lib/helper';
import { last } from 'react-stockcharts/lib/utils';
import swal from 'sweetalert2';

import logo from './7.png';
import logo_back from './7_180.png';
import {Grid, Row, Col} from 'react-bootstrap';
import './App.css';

class App extends Component {
	state = {
		defaultList: [],
		selectedCoin: "",
		selectedCalcCoin: "",
		timeTo: 0,
		limit: 0,
		cryptoDataList: [],
		showDiv: false
	}

	handleCoinChange=({target}) => {
		this.setState({selectedCoin: target.value, showDiv: false})
	}

	/*Picked dates are not transformed to UTC date because their times are set to 00:00 and 23:59*/
	handleSelect=(range) => {
		// Range - an object with two keys: 'startDate' and 'endDate' which are Momentjs objects.
		var secStartDate = moment.utc((range.startDate._d).toLocaleDateString())/1000;
		var secEndDate = moment.utc((range.endDate._d).toLocaleDateString())/1000;
		var currentTime = new Date().getTime();
		
		var limit = (secEndDate - secStartDate)/86400;
		if (limit < 5 && limit !== 0) {
			swal({
			  text: "Please select a wider range",
			  type: "error",
			  customClass: "alert",
			  confirmButtonColor: '#005e8b'
			});
		}
		this.setState({timeTo: secEndDate, limit: limit}) 
    }

	/*Gets all the prices needed for calculation of SMA, and arranges them in the right order*/
	calculateSMA=() => {
		var selectedCalcCoin = this.state.selectedCoin
		//checks that all values are valid before submitting
		if (this.state.selectedCoin === "" && this.state.limit < 5) {
			swal({
			  text: "Please select your values",
			  type: "error",
			  customClass: "alert",
			  confirmButtonColor: '#005e8b'
			});
		}
		else if (this.state.limit < 5) {
			swal({
			  text: "Please select a wider range",
			  type: "error",
			  customClass: "alert",
			  confirmButtonColor: '#005e8b'
			});
		}
		else if (this.state.selectedCoin === "") {
			swal({
			  text: "Please select your cryptocurrency",
			  type: "error",
			  customClass: "alert",
			  confirmButtonColor: '#005e8b'
			});
		}
		else {
			fetch(`https://min-api.cryptocompare.com/data/histoday?fsym=${this.state.selectedCoin}&tsym=EUR&limit=${this.state.limit}&e=CCCAGG&toTs=${this.state.timeTo}`)
			.then(res => res.json())
			.then(res => {
				const formatted = res.Data.map(day => {
					var dateMilisec = day.time*1000
					return {date: dateMilisec, open: day.open, high: day.high, low: day.low, close: day.close}
				})
				this.setState({selectedCalcCoin: selectedCalcCoin, cryptoDataList: formatted})	
			})
		}
	}

	/*Gets all the coins data, and stores only data related to the default watchlist*/
	componentDidMount() {
		fetch('https://min-api.cryptocompare.com/data/all/coinlist', {
			mode: 'cors'
		})
		.then(res => res.json())
		.then(res => {
			var defaultList = []
			var defaultIDs = res.DefaultWatchlist.CoinIs.split([','])
			for (var key in res.Data) {
				if(defaultIDs.includes(res.Data[key].Id)) {
					defaultList.push(res.Data[key])	
				}	
			}
			this.setState({defaultList: defaultList})
		})
	}


    render() {
	  let Data = this.state.cryptoDataList
	  const sma20 = sma()
	  	  .options({ windowSize: 9 })
		  .merge((d, c) => {d.sma20 = c;})
		  .accessor(d => d.sma20);
	  const calculatedData = sma20(Data);
	  const xScaleProvider = discontinuousTimeScaleProvider.inputDateAccessor(d => new Date(d.date)) 
	  const {
		  data,
		  xScale,
		  xAccessor,
		  displayXAccessor,
	  } = xScaleProvider(calculatedData);

	  const start = xAccessor(last(data));
	  const end = xAccessor(data[Math.max(0, data.length - 150)]);
	  const xExtents = [start, end];
		
      return (
      <div className="App">
        <header className="App-header">
		  <div className="logo_container">
			 <div className="logo_card">
				<div className="logo_face front">
				  <img src={logo} className="App-logo" alt="logo" />
				</div>
				<div className="logo_face back">
				  <img src={logo_back} className="App-logo" alt="logo" />
				</div>
			 </div>
		  </div>
          <h1 className="App-title">Track all the cryptocurrencies, check their SMA, and other details.</h1>
        </header>
		<div>
			<Grid fluid style={{marginTop:"1em"}}>
				<Row>
					<Col md={4}>
					  <div>
						<div className="dropdown_container">
							{this.state.defaultList.map(coin =>
								{if (coin.Name === this.state.selectedCoin) {
									return(<div className="selected_coin" key={coin.Id}>
											<img src={`https://www.cryptocompare.com${coin.ImageUrl}`} alt={coin.Name} style={{width:"45px", height:"45px"}}/>
											<span className="coin_text"> {coin.Name}</span>
										</div>)
								}
								}
							)}
							<button className="select_btn" onClick={() => this.setState({showDiv: !this.state.showDiv})}>Cryptocurrency <i className="glyphicon glyphicon-menu-down" style={{fontSize:"0.8em"}}></i></button>
						</div>
						<div className={(this.state.showDiv) ? "drop_div" : "hide_div"}>
							<ul className="ul_style">
								<div className="cc-selector">
								{this.state.defaultList.map(coin => 
									<li key={coin.Id}><input id={coin.Name} type="radio" name="cryptosymbol" value={coin.Name} onChange={this.handleCoinChange}/><label className="drinkcard-cc" style={{backgroundImage:"url("+`https://www.cryptocompare.com${coin.ImageUrl}`+")"}} htmlFor={coin.Name}></label></li> 	
								)}
								</div>
							</ul>
						</div>
						<div style={{marginTop:"1em"}}>
							<div className="date_text">SELECT A DATE RANGE:</div>
							<DateRange
								onChange={this.handleSelect}
								maxDate={moment()}
							/>
						</div>
						<button className="calculate_btn" onClick={this.calculateSMA}>Calculate</button>
					  </div>
					</Col>
					<Col md={8}>
						{this.state.cryptoDataList.length > 0 &&
						<ChartCanvas width={500} height={440}
								margin={{left: 40, right: 40, top:10, bottom: 30}} type={"svg"}
								seriesName="MSFT"
								data={data}
								xAccessor={xAccessor} xScale={xScale} ratio={1}
								displayXAccessor={displayXAccessor}
								xExtents={xExtents}>

							<Chart id={1} 
								yExtents={[d => [d.high, d.low], sma20.accessor()]}
								padding={{ top: 55, bottom: 20 }}
								>
								<XAxis axisAt="bottom" orient="bottom" ticks={8}/>
								<YAxis axisAt="left" orient="left" ticks={5} />
								
								<MouseCoordinateY
									at="right"
									orient="right"
									displayFormat={format(".2f")} />
								
								<CandlestickSeries />
								<LineSeries yAccessor={sma20.accessor()} stroke={sma20.stroke()}/>
								<CurrentCoordinate yAccessor={sma20.accessor()} fill={sma20.stroke()} />
								
								<OHLCTooltip origin={[-40, 0]}/>
								<MovingAverageTooltip
									onClick={e => console.log(e)}
									origin={[-38, 15]}
									options={[
										{
											yAccessor: sma20.accessor(),
											type: "SMA",
											stroke: sma20.stroke(),
											windowSize: sma20.options().windowSize,
											echo: "some echo here",
										}
									]}
								/>
							</Chart>
						</ChartCanvas>
						}
						
						{this.state.defaultList.map(coin =>
							{if (this.state.cryptoDataList.length && coin.Name === this.state.selectedCalcCoin) {
								return (<table>
										  <thead>
											<tr>
												<th><img src={`https://www.cryptocompare.com${coin.ImageUrl}`} alt={coin.Name} style={{width:"40px", height:"40px"}}/><span className="coin_text"> {coin.Name}</span></th>
												<th>OPEN PRICE(EUR)</th> 
												<th>HIGH PRICE(EUR)</th>
												<th>LOW PRICE(EUR)</th> 
												<th>CLOSE PRICE(EUR)</th>
											</tr>
										  </thead>
										  <tbody>
											{this.state.cryptoDataList.map(element =>
											<tr>
												<td className="coin_text">{new Date(element.date).toLocaleDateString()}</td>
												<td>{element.open.toFixed(2)}</td>
												<td>{element.high.toFixed(2)}</td>
												<td>{element.low.toFixed(2)}</td>
												<td>{element.close.toFixed(2)}</td>
											</tr>							 
											)} 
										 </tbody>
									</table>)
							}}	
						)}
						
					</Col>
				</Row>
			</Grid>
		</div>
      </div>
    );
  }
}

export default App;
