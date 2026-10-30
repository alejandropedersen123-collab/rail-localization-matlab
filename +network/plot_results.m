function plot_results(results,out)
R=results{1}; net=R.network;
f=figure('Visible','off','Color','w','Position',[40 40 1400 900]);
tiledlayout(2,1,'TileSpacing','compact','Padding','compact');
nexttile; hold on;
colors=[124 227 200;245 191 112;164 161 255;255 145 182; ...
    72 148 205;181 161 53;219 115 58;128 166 60]/255;
for i=1:8
    progress=R.trace(:,i,1)/1000;
    if R.trains(i).direction<0, progress=R.trains(i).length/1000-progress; end
    progress(R.trace(:,i,3)==0 | R.trace(:,i,3)==3)=NaN;
    plot(R.time/60,progress,'Color',colors(i,:),'LineWidth',1.5, ...
        'DisplayName',R.trains(i).id+" "+R.trains(i).label);
end
yline(343.67,':','Cordoba (aprox.)','HandleVisibility','off','LabelVerticalAlignment','bottom');
yline(358,':','Bif. Malaga (aprox.)','HandleVisibility','off','LabelVerticalAlignment','top');
grid on; xlabel('Tiempo del modelo (min)'); ylabel('Distancia por ruta desde Madrid (km)');
title({'Ocho servicios simulados sobre la red Madrid-Andalucia', ...
    'Los ramales distintos no comparten el mismo eje fisico'});
legend('Location','eastoutside','Interpreter','none');
nexttile; hold on;
for k=1:numel(results)
    S=results{k}; plot(S.time/60,sum(S.trace(:,:,3)==1 | S.trace(:,:,3)==2,2), ...
        'LineWidth',1.5,'DisplayName',strrep(S.scenario,'_',' '));
end
ylim([0 8.5]); yticks(0:8); grid on; xlabel('Tiempo del modelo (min)');
ylabel('Trenes activos'); title('Movimientos independientes, paradas y llegadas'); legend('Location','best');
set(findall(f,'Type','axes'),'Color','w','XColor',[.1 .15 .2],'YColor',[.1 .15 .2]);
set(findall(f,'Type','text'),'Color',[.1 .15 .2]);
exportgraphics(f,fullfile(out,'operations.png'),'Resolution',140); close(f);
f=figure('Visible','off','Color','w','Position',[40 40 1400 800]);
tiledlayout(2,1,'TileSpacing','compact','Padding','compact');
nexttile; hold on;
for i=1:8
    gap=R.trace(:,i,5)/1000; gap(~isfinite(gap))=NaN;
    plot(R.time/60,gap,'LineWidth',1.1,'Color',colors(i,:),'DisplayName',R.trains(i).id);
end
grid on; xlabel('Tiempo del modelo (min)'); ylabel('Hueco de cabeza a cola (km)');
title('Separacion calculada en el mismo sentido; sin lider = sin valor'); legend('Location','eastoutside');
nexttile; travel=zeros(8,numel(results));
for k=1:numel(results), travel(:,k)=results{k}.summary.Travel_min; end
bar(travel); xticklabels(string({R.trains.id})); ylabel('Duracion del viaje (min)'); grid on;
title('Circulaciones ficticias: estos tiempos no son horarios comerciales');
legend(cellfun(@(r) strrep(r.scenario,'_',' '),results,'UniformOutput',false),'Location','eastoutside');
set(findall(f,'Type','axes'),'Color','w','XColor',[.1 .15 .2],'YColor',[.1 .15 .2]);
set(findall(f,'Type','text'),'Color',[.1 .15 .2]);
exportgraphics(f,fullfile(out,'separation.png'),'Resolution',140); close(f);
writetable(net.edges,fullfile(out,'edges.csv'));
end
