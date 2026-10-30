function plot_results(results,out)
R=results{1}; net=R.network; N=numel(R.trains);
f=figure('Visible','off','Color','w','Position',[40 40 1400 900]);
tiledlayout(2,1,'TileSpacing','compact','Padding','compact');
nexttile; hold on;
colors=lines(N);
if isfield(net,'project'), path=net.project.analysisRoute; else, path=1:5; end
for i=1:N
    progress=nan(numel(R.time),1); offset=0;
    for signed=path(:)'
        e=abs(signed); mask=R.trace(:,i,7)==e; x=R.trace(mask,i,8)/1000;
        if signed<0, x=net.edges.Length_km(e)-x; end
        progress(mask)=offset+x; offset=offset+net.edges.Length_km(e);
    end
    progress(R.trace(:,i,3)==0 | R.trace(:,i,3)==3)=NaN;
    plot(R.time/60,progress,'Color',colors(i,:),'LineWidth',1.5, ...
        'DisplayName',R.trains(i).id+" "+R.trains(i).label);
end
grid on; xlabel('Tiempo del modelo (min)'); ylabel('Distancia sobre la ruta de referencia (km)');
title('Circulaciones simuladas; solo se dibujan los tramos de la ruta de referencia');
legend('Location','eastoutside','Interpreter','none');
nexttile; hold on;
for k=1:numel(results)
    S=results{k}; plot(S.time/60,sum(S.trace(:,:,3)==1 | S.trace(:,:,3)==2,2), ...
        'LineWidth',1.5,'DisplayName',strrep(S.scenario,'_',' '));
end
ylim([0 N+.5]); yticks(0:N); grid on; xlabel('Tiempo del modelo (min)');
ylabel('Trenes activos'); title('Movimientos independientes, paradas y llegadas'); legend('Location','best');
set(findall(f,'Type','axes'),'Color','w','XColor',[.1 .15 .2],'YColor',[.1 .15 .2]);
set(findall(f,'Type','text'),'Color',[.1 .15 .2]);
exportgraphics(f,fullfile(out,'operations.png'),'Resolution',140); close(f);
f=figure('Visible','off','Color','w','Position',[40 40 1400 800]);
tiledlayout(2,1,'TileSpacing','compact','Padding','compact');
nexttile; hold on;
for i=1:N
    gap=R.trace(:,i,5)/1000; gap(~isfinite(gap))=NaN;
    plot(R.time/60,gap,'LineWidth',1.1,'Color',colors(i,:),'DisplayName',R.trains(i).id);
end
grid on; xlabel('Tiempo del modelo (min)'); ylabel('Hueco de cabeza a cola (km)');
title('Separacion calculada en el mismo sentido; sin lider = sin valor'); legend('Location','eastoutside');
nexttile; travel=zeros(N,numel(results));
for k=1:numel(results), travel(:,k)=results{k}.summary.Travel_min; end
bar(travel); xticklabels(string({R.trains.id})); ylabel('Duracion del viaje (min)'); grid on;
title('Circulaciones ficticias: estos tiempos no son horarios comerciales');
legend(cellfun(@(r) strrep(r.scenario,'_',' '),results,'UniformOutput',false),'Location','eastoutside');
set(findall(f,'Type','axes'),'Color','w','XColor',[.1 .15 .2],'YColor',[.1 .15 .2]);
set(findall(f,'Type','text'),'Color',[.1 .15 .2]);
exportgraphics(f,fullfile(out,'separation.png'),'Resolution',140); close(f);
writetable(net.edges,fullfile(out,'edges.csv'));
end
