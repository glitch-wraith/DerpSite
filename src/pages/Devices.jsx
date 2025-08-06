import React, { useState, useEffect } from 'react';

const BRANDS = ['All', 'Xiaomi', 'Poco', 'Redmi', 'OnePlus', 'Nothing', 'Motorola', 'Google', 'Samsung'];

const formatSize = bytes => {
  if (bytes < 1024) return bytes + ' B';
  const kb = bytes / 1024;
  if (kb < 1024) return kb.toFixed(1) + ' KB';
  const mb = kb / 1024;
  if (mb < 1024) return mb.toFixed(1) + ' MB';
  const gb = mb / 1024;
  return gb.toFixed(1) + ' GB';
};

const formatDate = timestamp => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const DevicesPage = () => {
  const [devices, setDevices] = useState([]);
  const [deviceData, setDeviceData] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('All');
  const [expandedDevice, setExpandedDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const devicesResponse = await fetch('/devices.txt');
        if (!devicesResponse.ok) throw new Error('Failed to load devices list');
        
        const text = await devicesResponse.text();
        const lines = text.split('\n').filter(line => line.trim() !== '');
        
        const devicesList = [];
        for (let i = 0; i < lines.length; i += 4) {
          if (i + 3 >= lines.length) break;
          
          const nameLine = lines[i].trim();
          const codenameMatch = nameLine.match(/\((.*?)\)$/);
          
          if (codenameMatch) {
            devicesList.push({
              name: nameLine.replace(`(${codenameMatch[1]})`, '').trim(),
              codename: codenameMatch[1],
              maintainer: lines[i + 1].trim(),
              jsonUrl: lines[i + 2].trim(),
              changelogUrl: lines[i + 3].trim()
            });
          }
        }
        
        setDevices(devicesList);
        
        const deviceDataMap = {};
        await Promise.all(devicesList.map(async device => {
          try {
            const [jsonRes, changelogRes] = await Promise.all([
              fetch(device.jsonUrl),
              fetch(device.changelogUrl)
            ]);
            
            if (!jsonRes.ok || !changelogRes.ok) {
              throw new Error(`Failed to fetch data for ${device.codename}`);
            }
            
            const [jsonData, changelog] = await Promise.all([
              jsonRes.json(),
              changelogRes.text()
            ]);
            
            const builds = jsonData.response || [];
            deviceDataMap[device.codename] = { 
              builds,
              changelog,
              status: builds[0]?.romtype || 'Unknown' 
            };
          } catch (err) {
            console.error(`Error loading ${device.codename}:`, err);
            deviceDataMap[device.codename] = { 
              error: true,
              builds: [],
              changelog: 'Failed to load changelog',
              status: 'Error'
            };
          }
        }));
        
        setDeviceData(deviceDataMap);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDevices();
  }, []);

  const filteredDevices = devices.filter(device => {
    const matchesSearch = searchTerm === '' || 
      device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.codename.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesBrand = selectedBrand === 'All' || 
      device.name.toLowerCase().startsWith(selectedBrand.toLowerCase());
    
    return matchesSearch && matchesBrand;
  });

  const handleCardClick = codename => {
    setExpandedDevice(expandedDevice === codename ? null : codename);
  };

  if (error) return <div className="devices-error text-center py-8">Error: {error}</div>;
  if (loading) return <div className="devices-loading text-center py-8">Loading devices...</div>;

  return (
    <div className="devices-page p-4 max-w-7xl mx-auto">
      <div className="devices-search-container mb-6">
        <input
          type="text"
          placeholder="Search devices..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
        />
      </div>

      <div className="devices-brand-filter flex flex-wrap gap-2 mb-8">
        {BRANDS.map(brand => (
          <button
            key={brand}
            className={`devices-brand-pill px-4 py-2 rounded-full border transition-all ${
              selectedBrand === brand 
                ? 'bg-blue-500 text-white border-blue-500' 
                : 'bg-white border-gray-300 hover:bg-gray-100'
            }`}
            onClick={() => setSelectedBrand(brand)}
          >
            {brand}
          </button>
        ))}
      </div>

      <div className="devices-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDevices.map(device => {
          const data = deviceData[device.codename] || {};
          const isExpanded = expandedDevice === device.codename;
          const status = data.status;
          
          return (
            <div 
              key={device.codename}
              className={`devices-card border border-gray-200 rounded-xl overflow-hidden bg-white transition-all ${
                isExpanded ? 'devices-card-expanded shadow-xl' : 'shadow-md hover:shadow-lg hover:-translate-y-1'
              }`}
            >
              <div 
                className="devices-card-content p-6 cursor-pointer"
                onClick={() => handleCardClick(device.codename)}
              >
                <div className="devices-image-container flex justify-center mb-4 bg-gray-50 rounded-lg p-4 min-h-[200px] items-center">
                  <img
                    src={`/img/devices/${device.codename}.png`}
                    alt={device.name}
                    onError={e => {
                      e.target.src = '/img/devices/placeholder.png';
                      e.target.classList.add('devices-placeholder-image');
                    }}
                    className="devices-image max-h-[180px] max-w-full object-contain"
                  />
                </div>
                
                <div className="devices-info mb-4">
                  <h3 className="text-xl font-bold mb-1">{device.name}</h3>
                  <p className="devices-codename text-gray-500 italic mb-2">{device.codename}</p>
                  <p className="mb-2">
                    Maintainer:{' '}
                    <a 
                      href={`https://github.com/${device.maintainer}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="devices-maintainer-link text-blue-500 hover:text-blue-700 hover:underline transition-colors"
                      onClick={e => e.stopPropagation()}
                    >
                      @{device.maintainer}
                    </a>
                  </p>
                  <span className={`devices-status inline-block px-3 py-1 rounded-full text-sm font-medium ${
                    status === 'Official' ? 'bg-green-100 text-green-800' : 
                    status === 'Community' ? 'bg-blue-100 text-blue-800' : 
                    status === 'Beta' ? 'bg-yellow-100 text-yellow-800' : 
                    status === 'Discontinued' ? 'bg-red-100 text-red-800' : 
                    'bg-purple-100 text-purple-800'
                  }`}>
                    {status}
                  </span>
                </div>
                
                <button className="devices-view-button bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors self-start mt-auto">
                  {isExpanded ? 'Hide Builds' : 'View Builds'}
                </button>
              </div>

              <div className={`devices-accordion-content overflow-hidden transition-all duration-400 ${
                isExpanded ? 'max-h-[1000px] py-0 px-6 pb-6' : 'max-h-0'
              }`}>
                {data.builds?.length > 0 ? (
                  <div className="devices-builds-container mt-6">
                    <h4 className="text-lg font-semibold mb-3">Available Builds:</h4>
                    <ul className="space-y-3">
                      {data.builds.map((build, index) => (
                        <li key={index} className="devices-build-item">
                          <a 
                            href={build.url} 
                            download
                            className="devices-download-link block p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                            onClick={e => e.stopPropagation()}
                          >
                            <div className="devices-build-header flex justify-between items-center mb-2">
                              <span className="devices-build-version font-semibold">{build.version}</span>
                              <span className={`devices-build-type px-2 py-1 rounded text-xs font-medium ${
                                build.romtype === 'Official' ? 'bg-green-100 text-green-800' : 
                                build.romtype === 'Beta' ? 'bg-yellow-100 text-yellow-800' : 
                                build.romtype === 'Community' ? 'bg-blue-100 text-blue-800' : 
                                'bg-purple-100 text-purple-800'
                              }`}>
                                {build.romtype}
                              </span>
                            </div>
                            <div className="devices-build-meta flex justify-between text-gray-500 text-sm mb-1">
                              <span>{formatDate(build.datetime)}</span>
                              <span>{formatSize(build.size)}</span>
                            </div>
                            <div className="devices-filename text-gray-700 text-sm truncate">
                              {build.filename}
                            </div>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="py-4 text-gray-500">No builds available</p>
                )}
                
                <div className="devices-changelog-container mt-6">
                  <h4 className="text-lg font-semibold mb-3">Changelog:</h4>
                  <pre className="devices-changelog-text bg-gray-50 p-4 rounded-lg border border-gray-200 max-h-[300px] overflow-y-auto whitespace-pre-wrap text-sm">
                    {data.changelog || 'No changelog available'}
                  </pre>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DevicesPage;