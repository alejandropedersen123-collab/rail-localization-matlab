function m=sensor_without_ranges(varargin)
% Replace just ranging; all other channels remain identical.
m=rail.sensor_sample(varargin{:}); m.ranges(:)=NaN;
end
