//import * as io from "socket.io-client";
import { default as React} from "react";
//import MainLayout from "./MainLayout";
//import Header from "./Header";
import '../css/Dashboard2.css';
import { useNavigate } from "react-router-dom";

const Dashboard2: React.FC = () => {
    
    const navigate = useNavigate();

    const handleToVideo = () => {
        // Perform login logic here
        navigate('/video');
      };
    
    return (
        <React.Fragment>
            <div className="dashboard">
                    <div className="dashboard_header">
                        <p>Dashboard</p>
                    </div>
                    <div className="boxes">
                        <div className="box">
                            <h2>Test assigned</h2>
                            <p>5</p>
                        </div>
                        <div className="box">
                            <h2>Completed Tests</h2>
                            <p>2</p>
                        </div>
                        <div className="box">
                            <h2>Pending Tests</h2>
                            <p>3</p>
                        </div>
                    </div>
                    <div className="dashboard_content">
                        <table className="dashboard-table">
                            <thead>
                                <tr>
                                <th>SI#</th>
                                <th>Test Name</th>
                                <th>Status</th>
                                <th>Assigned Date</th>
                                <th>Scores</th>
                                <th>Results</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                <td>1</td>
                                <td>
                                    <button className="dashboard_button" onClick={handleToVideo}>Effective Communication</button>
                                </td>
                                <td>Upcoming</td>
                                <td>15/12/2022</td>
                                <td>NA</td>
                                <td>Passed</td>
                                </tr>
                                {/*<tr>
                                <td>2</td>
                                <td>
                                    <button className="dashboard_button">Chat</button>
                                </td>
                                <td>Pending</td>
                                <td>12/22/2023</td>
                                <td>NA</td>
                                <td>Passed</td>
                                </tr>*/}
                            </tbody>
                        </table>
                    </div>
                    
                
          </div>
        </React.Fragment>
    );
}

export default Dashboard2;