'use client';

import { useEffect, useState } from 'react';
import { useDictionary } from '@/lib/i18n';
import { api, PrintJob, SKU, Printer, Inventory, OrderItem, Order, Supply, FinishedGood } from '@/services/api';
import { Clock, Printer as PrinterIcon, Package, CheckCircle, Plus, Trash2, Edit2, AlertTriangle, ImageIcon, Scissors, Wrench, Play, Store } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/modal';
import { toast } from 'sonner';
import { PageLayout } from '@/components/ui/PageLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import { useDroppable, useDraggable } from '@dnd-kit/core';

type JobStatus = PrintJob['status'];

const columns: { id: JobStatus; titleKey: string; icon: any; colorClass: string }[] = [
  { id: 'queued', titleKey: 'queued', icon: Clock, colorClass: 'text-amber-500' },
  { id: 'printing', titleKey: 'printing', icon: PrinterIcon, colorClass: 'text-blue-500' },
  { id: 'finishing', titleKey: 'finishing', icon: Wrench, colorClass: 'text-purple-500' },
  { id: 'finished', titleKey: 'finished', icon: CheckCircle, colorClass: 'text-green-500' },
];

function DroppableColumn({
  column, title, jobs, skus, printers, orderItems, orders, onEdit, onDelete, onSplit
}: {
  column: typeof columns[0],
  title: string,
  jobs: PrintJob[],
  skus: SKU[],
  printers: Printer[],
  orderItems: OrderItem[],
  orders: Order[],
  onEdit?: (j: PrintJob, e: React.MouseEvent) => void,
  onDelete?: (id: string, e: React.MouseEvent) => void,
  onSplit?: (j: PrintJob, e: React.MouseEvent) => void,
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col w-[280px] max-h-full rounded-lg p-3 border shadow-sm transition-colors",
        isOver ? "bg-muted border-primary" : "bg-muted/50"
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <column.icon className={cn('w-5 h-5', column.colorClass)} />
          <h2 className="font-semibold">{title}</h2>
        </div>
        <span className="bg-background text-muted-foreground text-xs font-medium px-2 py-1 rounded-full border">
          {jobs.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 min-h-[150px]">
        {jobs.map((job) => (
          <DraggableJobCard
            key={job.id}
            job={job}
            skus={skus}
            printers={printers}
            orderItems={orderItems}
            orders={orders}
            onEdit={onEdit}
            onDelete={onDelete}
            onSplit={onSplit}
          />
        ))}
        {jobs.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-8 border-2 border-dashed rounded-md opacity-50">
            Vazio
          </div>
        )}
      </div>
    </div>
  );
}

function DraggableJobCard({
  job, skus, printers, orderItems, orders, onEdit, onDelete, onSplit, isOverlay
}: {
  job: PrintJob,
  skus: SKU[],
  printers: Printer[],
  orderItems: OrderItem[],
  orders: Order[],
  onEdit?: (j: PrintJob, e: React.MouseEvent) => void,
  onDelete?: (id: string, e: React.MouseEvent) => void,
  onSplit?: (j: PrintJob, e: React.MouseEvent) => void,
  isOverlay?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: job.id,
    data: { job }
  });

  const sku = skus.find(s => s.id === job.sku_id);
  const printer = printers.find(p => p.id === job.printer_id);
  
  const relatedItem = job.order_item_id ? orderItems.find(oi => oi.id === job.order_item_id) : null;
  const relatedOrder = relatedItem?.order_id ? orders.find(o => o.id === relatedItem.order_id) : null;
  const isMarketplace = !!relatedOrder?.marketplace_source;

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group bg-card p-3 rounded-md border shadow-sm flex flex-col cursor-grab active:cursor-grabbing hover:border-primary transition-colors relative",
        isDragging && "opacity-40",
        isOverlay && "opacity-100 scale-105 shadow-xl cursor-grabbing rotate-2"
      )}
    >
      {!isOverlay && onEdit && onDelete && (
        <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 flex items-center space-x-1 transition-all bg-card/90 rounded-full p-1 border shadow-sm z-10">
          {onSplit && job.quantity > 1 && job.status === 'queued' && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => onSplit(job, e)}
              className="text-muted-foreground hover:text-violet-600 transition-colors p-1 cursor-pointer"
              title="Dividir"
            >
              <Scissors className="w-3.5 h-3.5" />
            </button>
          )}
          {!job.order_item_id && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => onDelete(job.id, e)}
              className="text-muted-foreground hover:text-destructive transition-colors p-1 cursor-pointer"
              title="Remover"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      <div className="flex justify-between items-start mb-2 pr-12">
        <span className="text-xs font-bold text-muted-foreground">{job.id.split('-')[0]}</span>
        <div className="flex space-x-1">
          {relatedItem && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground flex items-center">
              Pedido
              {isMarketplace && <span title={relatedOrder?.marketplace_source || undefined}><Store className="w-3 h-3 ml-1 text-violet-600" /></span>}
            </span>
          )}
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            {job.quantity}x
          </span>
        </div>
      </div>

      <div className="flex items-start gap-2.5 mb-1">
        {sku?.image_url ? (
          <img src={sku.image_url} alt={sku.name} className="w-9 h-9 rounded object-cover border flex-shrink-0" />
        ) : (
          <div className="w-9 h-9 rounded bg-muted/50 border flex items-center justify-center flex-shrink-0">
            <ImageIcon className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
        <div>
          <h3 className="font-medium text-sm leading-tight">{sku?.name || 'Produto Removido'}</h3>
          <p className="text-xs text-muted-foreground">{sku?.filament_type || ''}</p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-auto pt-2">
        {printer && (job.status === 'printing' || job.status === 'finishing') && (
          <div className="flex items-center text-[10px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200">
            <PrinterIcon className="w-3 h-3 mr-1" />
            {printer.name}
          </div>
        )}
        {job.finishing_notes && job.status === 'finishing' && (
          <div className="text-[10px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 truncate max-w-[120px]">
            {job.finishing_notes}
          </div>
        )}
      </div>

      {job.status === 'finishing' && !isOverlay && (
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onEdit?.(job, e); }}
          className="w-full mt-2 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 text-xs font-bold rounded border border-green-200 flex items-center justify-center transition-colors cursor-pointer"
        >
          <CheckCircle className="w-3.5 h-3.5 mr-1" />
          Concluir Acabamento
        </button>
      )}
    </div>
  );
}

export default function ProducaoPage() {
  const { dict: fullDict } = useDictionary();
  const dict = (fullDict as any).producao;

  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [skus, setSkus] = useState<SKU[]>([]);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [finishedGoods, setFinishedGoods] = useState<FinishedGood[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Setup (queued -> printing)
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [setupJob, setSetupJob] = useState<PrintJob | null>(null);
  const [selectedSetupPrinterId, setSelectedSetupPrinterId] = useState<string>('');

  // Completion (printing -> finishing)
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
  const [completionJob, setCompletionJob] = useState<PrintJob | null>(null);

  // Failure (printing -> queued)
  const [isFailureModalOpen, setIsFailureModalOpen] = useState(false);
  const [failureJob, setFailureJob] = useState<PrintJob | null>(null);

  // Split
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [splitJob, setSplitJob] = useState<PrintJob | null>(null);

  // Finish (finishing -> finished) with notes
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [finishJob, setFinishJob] = useState<PrintJob | null>(null);

  // Skip Print (queued -> finishing)
  const [isSkipModalOpen, setIsSkipModalOpen] = useState(false);
  const [skipJob, setSkipJob] = useState<PrintJob | null>(null);

  // New standalone print
  const [isNewPrintModalOpen, setIsNewPrintModalOpen] = useState(false);

  // Dnd
  const [activeJob, setActiveJob] = useState<PrintJob | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setIsLoading(true);
    const [fetchedJobs, fetchedSkus, fetchedPrinters, fetchedInventory, fetchedSupplies, fetchedItems, fetchedOrders, fetchedGoods] = await Promise.all([
      api.getPrintJobs(),
      api.getSKUs(),
      api.getPrinters(),
      api.getInventory(),
      api.getSupplies(),
      api.getAllOrderItems(),
      api.getOrders(),
      api.getFinishedGoods()
    ]);
    setJobs(fetchedJobs);
    setSkus(fetchedSkus);
    setPrinters(fetchedPrinters);
    setInventory(fetchedInventory);
    setSupplies(fetchedSupplies);
    setOrderItems(fetchedItems);
    setOrders(fetchedOrders);
    setFinishedGoods(fetchedGoods);
    setIsLoading(false);
  }

  const handleDeleteJob = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Excluir esta tarefa de impressão?')) return;
    try {
      await api.deletePrintJob(id);
      toast.success('Tarefa removida!');
      await loadData();
    } catch (error) {
      toast.error('Erro ao deletar tarefa.');
    }
  };

  const openSplit = (job: PrintJob, e: React.MouseEvent) => {
    e.stopPropagation();
    setSplitJob(job);
    setIsSplitModalOpen(true);
  };

  const openSetupModal = (job: PrintJob, e: React.MouseEvent) => {
    e.stopPropagation();
    setSetupJob(job);
    setIsSetupModalOpen(true);
  };

  const handleSplit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!splitJob) return;
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const qty = Number(formData.get('splitQty'));
    try {
      await api.splitPrintJob(splitJob.id, qty);
      toast.success(`Tarefa dividida: ${splitJob.quantity - qty} + ${qty}`);
      await loadData();
      setIsSplitModalOpen(false);
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao dividir.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Setup: queued -> printing
  const handleSetupPrint = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!setupJob) return;
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const printerId = formData.get('printer_id') as string;

    const selectedPrinter = printers.find(p => p.id === printerId);
    const spoolCapacity = selectedPrinter?.spool_capacity || 1;

    const inventoryIds: string[] = [];
    for (let i = 0; i < spoolCapacity; i++) {
      const val = formData.get(`inventory_id_${i}`) as string;
      if (val) inventoryIds.push(val);
    }

    try {
      await api.updatePrintJob(setupJob.id, {
        status: 'printing',
        printer_id: printerId,
        inventory_ids: inventoryIds.length > 0 ? inventoryIds : undefined,
        inventory_id: inventoryIds.length > 0 ? inventoryIds[0] : null
      });
      if (printerId) await api.updatePrinter(printerId, { status: 'printing' });
      for (const invId of inventoryIds) {
        await api.updateInventory(invId, { status: 'in_use' });
      }

      // Se o job tem um pedido, avança o status do pedido para 'production'
      if (setupJob.order_item_id) {
        const oi = orderItems.find(o => o.id === setupJob.order_item_id);
        if (oi?.order_id) {
          await api.markOrderAsInProduction(oi.order_id);
        }
      }
      toast.success('Impressão Iniciada!');
      await loadData();
      setIsSetupModalOpen(false);
    } catch (error) {
      toast.error('Erro ao iniciar impressão.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Completion: printing -> finishing (baixa de material, libera impressora)
  const handleCompletePrint = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!completionJob) return;
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);

    try {
      await api.updatePrintJob(completionJob.id, { status: 'finishing' });

      if (completionJob.printer_id) {
        await api.updatePrinter(completionJob.printer_id, { status: 'idle' });
      }

      const idsToProcess = completionJob.inventory_ids?.length ? completionJob.inventory_ids : completionJob.inventory_id ? [completionJob.inventory_id] : [];

      if (idsToProcess.length > 0) {
        for (const invId of idsToProcess) {
          const actualWeight = Number(formData.get(`actual_weight_${invId}`) || 0);
          const wasteWeight = Number(formData.get(`waste_weight_${invId}`) || 0);
          const totalSpent = actualWeight + wasteWeight;
          const inv = inventory.find(i => i.id === invId);
          if (inv) {
            const newRemaining = Math.max(0, inv.remaining_grams - totalSpent);
            await api.updateInventory(inv.id, { remaining_grams: newRemaining, status: 'available' });
            
            const realOrderId = completionJob.order_item_id 
              ? orderItems.find(oi => oi.id === completionJob.order_item_id)?.order_id 
              : undefined;

            await api.logMaterialUsage({
              order_id: realOrderId,
              inventory_id: inv.id,
              printer_id: completionJob.printer_id || undefined,
              weight_used: actualWeight,
              weight_wasted: wasteWeight,
              type: 'success'
            });
          }
        }
      } else {
        const actualWeight = Number(formData.get('actual_weight_fallback') || 0);
        const wasteWeight = Number(formData.get('waste_weight_fallback') || 0);
        
        const realOrderId = completionJob.order_item_id 
          ? orderItems.find(oi => oi.id === completionJob.order_item_id)?.order_id 
          : undefined;

        await api.logMaterialUsage({
          order_id: realOrderId,
          printer_id: completionJob.printer_id || undefined,
          weight_used: actualWeight,
          weight_wasted: wasteWeight,
          type: 'success'
        });
      }

      toast.success('Impressão concluída! Peça em acabamento.');
      await loadData();
      setIsCompletionModalOpen(false);
    } catch (error: any) {
      console.error(error);
      toast.error(`Erro ao dar baixa: ${error?.message || 'Desconhecido'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Finish: finishing -> finished (move to finished_goods + check order)
  const handleFinishJob = async (job: PrintJob) => {
    setIsSubmitting(true);
    try {
      await api.updatePrintJob(job.id, { status: 'finished' });

      // Se tinha pedido vinculado, NÃO adicionamos no estoque genérico (já é do cliente)
      if (job.order_item_id) {
        const item = orderItems.find(oi => oi.id === job.order_item_id);
        if (item?.order_id) {
          await api.checkAndAdvanceOrder(item.order_id);
        }
      } else {
        // Impressão avulsa, sem dono. Vai para o estoque de Prontas
        await api.addFinishedGoods({
          sku_id: job.sku_id,
          quantity: job.quantity,
          print_job_id: job.id
        });
      }

      toast.success('Peça(s) concluída(s)!');
      await loadData();
    } catch (error) {
      toast.error('Erro ao concluir.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Skip Print: queued -> finishing
  const handleSkipPrint = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!skipJob) return;
    setIsSubmitting(true);

    try {
      const availableStock = finishedGoods.filter(g => g.sku_id === skipJob.sku_id).reduce((sum, g) => sum + g.quantity, 0);

      if (availableStock >= 1) {
        // Find one piece to deduct
        const piece = finishedGoods.find(g => g.sku_id === skipJob.sku_id && g.quantity > 0);
        if (piece) {
          if (piece.quantity === 1) {
            await api.deleteFinishedGood(piece.id);
          } else {
            await api.updateFinishedGood(piece.id, { quantity: piece.quantity - 1 });
          }
        }
      }

      await api.updatePrintJob(skipJob.id, { status: 'finishing' });
      toast.success('Impressão ignorada. Tarefa enviada para acabamento.');
      await loadData();
      setIsSkipModalOpen(false);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao pular impressão.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Failure: printing -> queued
  const handleFailurePrint = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!failureJob) return;
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);

    try {
      if (failureJob.printer_id) {
        await api.updatePrinter(failureJob.printer_id, { status: 'idle' });
      }

      // 1. Process filament waste ONLY IF it failed during printing
      if (failureJob.status !== 'finishing') {
        const idsToProcess = failureJob.inventory_ids?.length ? failureJob.inventory_ids : failureJob.inventory_id ? [failureJob.inventory_id] : [];
        if (idsToProcess.length > 0) {
          for (const invId of idsToProcess) {
            const wasteWeight = Number(formData.get(`waste_weight_${invId}`) || 0);
            if (wasteWeight > 0) {
              const inv = inventory.find(i => i.id === invId);
              if (inv) {
                const newRemaining = Math.max(0, inv.remaining_grams - wasteWeight);
                await api.updateInventory(inv.id, { remaining_grams: newRemaining, status: 'available' });
                
                const realOrderId = failureJob.order_item_id 
                  ? orderItems.find(oi => oi.id === failureJob.order_item_id)?.order_id 
                  : undefined;

                await api.logMaterialUsage({
                  order_id: realOrderId,
                  inventory_id: inv.id,
                  printer_id: failureJob.printer_id || undefined,
                  weight_used: 0,
                  weight_wasted: wasteWeight,
                  type: 'failure'
                });
              }
            }
          }
        } else {
          const wasteWeight = Number(formData.get('waste_weight_fallback') || 0);
          if (wasteWeight > 0) {
            const realOrderId = failureJob.order_item_id 
              ? orderItems.find(oi => oi.id === failureJob.order_item_id)?.order_id 
              : undefined;

            await api.logMaterialUsage({
              order_id: realOrderId,
              printer_id: failureJob.printer_id || undefined,
              weight_used: 0,
              weight_wasted: wasteWeight,
              type: 'failure'
            });
          }
        }
      }

      // 2. Process extra material waste (if any)
      const extraSupplyId = formData.get('extra_supply_id') as string;
      const extraWaste = Number(formData.get('extra_waste') || 0);
      
      if (extraSupplyId && extraWaste > 0) {
        const sup = supplies.find(s => s.id === extraSupplyId);
        if (sup) {
          const newRemaining = Math.max(0, sup.quantity - extraWaste);
          await api.updateSupply(sup.id, { quantity: newRemaining });
          
          const realOrderId = failureJob.order_item_id 
            ? orderItems.find(oi => oi.id === failureJob.order_item_id)?.order_id 
            : undefined;

          await api.logMaterialUsage({
            order_id: realOrderId,
            supply_id: sup.id,
            printer_id: failureJob.printer_id || undefined,
            weight_used: 0,
            weight_wasted: extraWaste,
            type: 'failure'
          });
        }
      }

      // 3. Devolver ao estoque se não foi arruinada no acabamento
      if (failureJob.status === 'finishing') {
        const isRuined = formData.get('is_ruined') === 'on';
        if (!isRuined) {
          await api.addFinishedGoods({
            sku_id: failureJob.sku_id,
            quantity: failureJob.quantity,
            print_job_id: failureJob.id
          });
          toast.success('Peça devolvida ao estoque de Peças Prontas.');
        }
      }

      await api.updatePrintJob(failureJob.id, { status: 'queued', printer_id: null, inventory_id: null, inventory_ids: [] });

      toast.success('Falha registrada. Tarefa retornou à fila.');
      await loadData();
      setIsFailureModalOpen(false);
    } catch (error: any) {
      console.error(error);
      toast.error(`Erro ao registrar falha: ${error?.message || 'Desconhecido'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // New standalone print
  const handleNewPrint = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    try {
      await api.createPrintJob({
        sku_id: formData.get('sku_id') as string,
        quantity: Number(formData.get('quantity')),
        status: 'queued',
      });
      toast.success('Impressão avulsa criada!');
      await loadData();
      setIsNewPrintModalOpen(false);
    } catch (error) {
      toast.error('Erro ao criar impressão.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // DnD
  const handleDragStart = (event: DragStartEvent) => {
    const job = jobs.find(j => j.id === event.active.id);
    if (job) setActiveJob(job);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveJob(null);
    if (!over) return;

    const jobId = active.id as string;
    const newStatus = over.id as JobStatus;
    const job = jobs.find(j => j.id === jobId);

    if (job && job.status !== newStatus) {
      // Validate transitions
      const validTransitions: Record<string, string[]> = {
        queued: ['printing', 'finishing'], // finishing = skip print and use stock
        printing: ['finishing', 'queued'], // queued = failure
        finishing: ['finished', 'queued'],
        finished: [],
        failed: ['queued'],
      };

      if (!validTransitions[job.status]?.includes(newStatus)) {
        toast.error('Movimento inválido.');
        return;
      }

      // Intercept: queued -> printing (setup modal)
      if (job.status === 'queued' && newStatus === 'printing') {
        setSetupJob(job);
        setSelectedSetupPrinterId(''); // reset printer selection
        setTimeout(() => setIsSetupModalOpen(true), 10);
        return;
      }

      // Intercept: printing -> finishing (completion modal)
      if (job.status === 'printing' && newStatus === 'finishing') {
        setCompletionJob(job);
        setTimeout(() => setIsCompletionModalOpen(true), 10);
        return;
      }

      // Intercept: printing -> queued (failure modal)
      if ((job.status === 'printing' || job.status === 'finishing') && newStatus === 'queued') {
        setFailureJob(job);
        setTimeout(() => setIsFailureModalOpen(true), 10);
        return;
      }

      // Intercept: finishing -> finished (complete & add to stock)
      if (job.status === 'finishing' && newStatus === 'finished') {
        await handleFinishJob(job);
        return;
      }

      // Intercept: queued -> finishing (skip print)
      if (job.status === 'queued' && newStatus === 'finishing') {
        setSkipJob(job);
        setTimeout(() => setIsSkipModalOpen(true), 10);
        return;
      }
    }
  };

  const openFinishModal = (job: PrintJob, e: React.MouseEvent) => {
    e.stopPropagation();
    // Direct finish
    handleFinishJob(job);
  };

  if (isLoading) {
    return <PageLayout><div className="flex h-full items-center justify-center"><div className="text-muted-foreground">{dict?.loading || 'Carregando tarefas...'}</div></div></PageLayout>;
  }

  const activeSkuForSetup = setupJob ? skus.find(s => s.id === setupJob.sku_id) : null;

  return (
    <PageLayout>
      <PageHeader
        title={dict?.title || 'Fila de Impressão'}
        subtitle={dict?.description || 'Gerencie as tarefas de impressão.'}
        icon={<PrinterIcon className="w-8 h-8 mr-3 text-primary" />}
        action={
          <button
            onClick={() => setIsNewPrintModalOpen(true)}
            className="flex items-center bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            {dict?.actions?.newPrint || 'Nova Impressão'}
          </button>
        }
      />

      <div className="flex-1 overflow-x-auto pb-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex h-full min-w-max space-x-4">
            {columns.map((column) => (
              <DroppableColumn
                key={column.id}
                column={column}
                title={(dict?.columns as any)?.[column.titleKey] || column.titleKey}
                jobs={jobs.filter(j => j.status === column.id)}
                skus={skus}
                printers={printers}
                orderItems={orderItems}
                orders={orders}
                onEdit={openFinishModal}
                onDelete={handleDeleteJob}
                onSplit={openSplit}
              />
            ))}
          </div>

          <DragOverlay>
            {activeJob ? (
              <DraggableJobCard
                job={activeJob}
                skus={skus}
                printers={printers}
                orderItems={orderItems}
                orders={orders}
                isOverlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Modal: Nova Impressão Avulsa */}
      <Modal isOpen={isNewPrintModalOpen} onClose={() => setIsNewPrintModalOpen(false)} title={dict?.actions?.newPrint || 'Nova Impressão Avulsa'}>
        <form onSubmit={handleNewPrint} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-bold">Produto (SKU)</label>
            <select name="sku_id" required className="w-full p-2 border rounded-md text-sm bg-background">
              <option value="">Selecione...</option>
              {skus.map(s => <option key={s.id} value={s.id}>{s.name} ({s.filament_type})</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold">Quantidade de Peças</label>
            <input name="quantity" type="number" min={1} defaultValue={1} required className="w-full p-2 border rounded-md text-sm bg-background" />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <button type="button" onClick={() => setIsNewPrintModalOpen(false)} className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted transition-colors">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md disabled:opacity-50 hover:bg-primary/90 transition-colors">
              {isSubmitting ? 'Criando...' : 'Criar Tarefa'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Dividir Tarefa */}
      <Modal isOpen={isSplitModalOpen} onClose={() => setIsSplitModalOpen(false)} title={dict?.actions?.splitTitle || 'Dividir Tarefa'}>
        <form onSubmit={handleSplit} className="space-y-4">
          <p className="text-sm text-muted-foreground">{dict?.actions?.splitDesc || 'Separe parte das peças para outra impressora.'}</p>
          <p className="text-sm">Quantidade atual: <strong>{splitJob?.quantity}</strong> peças</p>
          <div className="space-y-2">
            <label className="text-sm font-bold">{dict?.actions?.splitQty || 'Quantidade a separar'}</label>
            <input name="splitQty" type="number" min={1} max={(splitJob?.quantity || 2) - 1} defaultValue={1} required className="w-full p-2 border rounded-md text-sm bg-background" />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <button type="button" onClick={() => setIsSplitModalOpen(false)} className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted transition-colors">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium bg-violet-600 text-white rounded-md disabled:opacity-50 hover:bg-violet-700 transition-colors">
              {isSubmitting ? 'Dividindo...' : dict?.actions?.splitConfirm || 'Dividir'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Setup de Impressão (queued -> printing) */}
      <Modal isOpen={isSetupModalOpen} onClose={() => !isSubmitting && setIsSetupModalOpen(false)} title={dict?.setup?.title || 'Iniciar Produção'}>
        <form onSubmit={handleSetupPrint} className="space-y-4">
          {activeSkuForSetup && (
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md border">
              {activeSkuForSetup.image_url ? (
                <img src={activeSkuForSetup.image_url} alt={activeSkuForSetup.name} className="w-12 h-12 rounded object-cover border" />
              ) : (
                <div className="w-12 h-12 rounded bg-muted border flex items-center justify-center"><ImageIcon className="w-5 h-5 text-muted-foreground" /></div>
              )}
              <div>
                <div className="font-bold text-sm">{activeSkuForSetup.name}</div>
                <div className="text-xs text-muted-foreground">{activeSkuForSetup.filament_type} • {activeSkuForSetup.weight_grams}g • {setupJob?.quantity}x peças</div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-bold">{dict?.setup?.allocatePrinter || 'Alocar Impressora'}</label>
            <select 
              name="printer_id" 
              required 
              className="w-full p-2 border rounded-md text-sm bg-background"
              value={selectedSetupPrinterId}
              onChange={(e) => setSelectedSetupPrinterId(e.target.value)}
            >
              <option value="" disabled>{dict?.setup?.selectPrinter || 'Selecione...'}</option>
              {printers.filter(p => p.status === 'idle').map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.brand} {p.model})</option>
              ))}
            </select>
          </div>

          <div className="space-y-2 border p-3 rounded-md bg-muted/30">
            <label className="text-sm font-bold">{dict?.setup?.allocateFilaments || 'Alocar Filamentos'}</label>
            {(() => {
              const selectedPrinter = printers.find(p => p.id === selectedSetupPrinterId);
              const capacity = selectedPrinter?.spool_capacity || 1;
              
              return Array.from({ length: capacity }).map((_, i) => (
                <div key={i} className="mt-2">
                  {capacity > 1 && <div className="text-xs font-semibold mb-1 text-muted-foreground">{dict?.setup?.slotPosition || 'Posição'} {i + 1}</div>}
                  <select name={`inventory_id_${i}`} className="w-full p-2 border rounded-md text-sm bg-background">
                    <option value="">{dict?.setup?.noAutoDeduction || 'Nenhum'}</option>
                    {inventory.filter(inv => inv.status === 'available' && inv.remaining_grams > 0).map(inv => (
                      <option key={inv.id} value={inv.id}>{inv.material_type} {inv.color} ({inv.remaining_grams}g)</option>
                    ))}
                  </select>
                </div>
              ));
            })()}
            {printers.find(p => p.id === selectedSetupPrinterId)?.spool_capacity! > 1 && (
              <p className="text-xs text-muted-foreground mt-2">{dict?.setup?.multicolorTip || 'Aconselhado para rastreio exato de consumo multi-color.'}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button type="button" onClick={() => setIsSetupModalOpen(false)} className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted transition-colors">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md disabled:opacity-50 hover:bg-blue-700 transition-colors">
              {isSubmitting ? dict?.setup?.starting || 'Iniciando...' : dict?.setup?.startPrint || 'Iniciar Impressão'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Baixa de Material (printing -> finishing) */}
      <Modal isOpen={isCompletionModalOpen} onClose={() => !isSubmitting && setIsCompletionModalOpen(false)} title={dict?.completion?.title || 'Baixa de Produção'}>
        <form onSubmit={handleCompletePrint} className="space-y-4">
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <h3 className="font-bold text-sm text-green-800 flex items-center"><CheckCircle className="w-4 h-4 mr-2" />{dict?.completion?.printFinished || 'Impressão Finalizada'}</h3>
            <p className="text-xs text-green-700 mt-1">{dict?.completion?.printFinishedDesc || 'A impressora será liberada. Confirme os gastos.'}</p>
          </div>

          {(() => {
            const sku = skus.find(s => s.id === completionJob?.sku_id);
            const defaultWeight = (sku?.weight_grams || 0) * (completionJob?.quantity || 1);
            
            const idsToProcess = completionJob?.inventory_ids?.length ? completionJob.inventory_ids : completionJob?.inventory_id ? [completionJob.inventory_id] : [];
            if (idsToProcess.length > 0) {
              return idsToProcess.map((invId, idx) => {
                const inv = inventory.find(i => i.id === invId);
                if (!inv) return null;
                // Dividir o peso padrão se houver múltiplos filamentos (simplificação)
                const weightPerFilament = Math.round(defaultWeight / idsToProcess.length);
                return (
                  <div key={idx} className="bg-muted/30 p-3 rounded-md border">
                    <div className="font-bold text-xs mb-2 flex items-center"><Package className="w-3 h-3 mr-1" />{inv.material_type} {inv.color} ({inv.remaining_grams}g restantes)</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-xs font-bold">{dict?.completion?.weightUsed || 'Peso Gasto (g)'}</label>
                        <input required type="number" name={`actual_weight_${invId}`} defaultValue={weightPerFilament} className="w-full p-2 border rounded-md text-sm bg-background font-medium" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold">{dict?.completion?.wasteWeight || 'Desperdício (g)'}</label>
                        <input required type="number" name={`waste_weight_${invId}`} defaultValue={0} className="w-full p-2 border rounded-md text-sm bg-background font-medium" />
                      </div>
                    </div>
                  </div>
                );
              });
            }
            return (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold">{dict?.completion?.weightUsedFull || 'Peso Gasto (g)'}</label>
                    <input required type="number" name="actual_weight_fallback" defaultValue={defaultWeight} className="w-full p-2 border rounded-md text-sm bg-background" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold">{dict?.completion?.wasteWeightFull || 'Desperdício (g)'}</label>
                    <input required type="number" name="waste_weight_fallback" defaultValue={0} className="w-full p-2 border rounded-md text-sm bg-background" />
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button type="button" onClick={() => setIsCompletionModalOpen(false)} className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted transition-colors">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-md disabled:opacity-50 hover:bg-green-700 transition-colors">
              {isSubmitting ? dict?.completion?.processing || 'Processando...' : dict?.completion?.confirmRelease || 'Confirmar e Liberar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Falha (printing -> queued) */}
      <Modal isOpen={isFailureModalOpen} onClose={() => !isSubmitting && setIsFailureModalOpen(false)} title={dict?.failure?.title || 'Falha de Produção'}>
        <form onSubmit={handleFailurePrint} className="space-y-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <h3 className="font-bold text-sm text-red-800 flex items-center"><AlertTriangle className="w-4 h-4 mr-2" />{dict?.failure?.printAborted || 'Impressão Abortada'}</h3>
            <p className="text-xs text-red-700 mt-1">{dict?.failure?.printAbortedDesc || 'A tarefa retornará para a fila.'}</p>
          </div>

          {failureJob?.status === 'finishing' ? (
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-xs text-blue-700">
                  O filamento desta peça já foi debitado do estoque no final da impressão. 
                  Se houve perda de insumos adicionais (tinta, embalagem), informe abaixo.
                </p>
              </div>
              <div className="flex items-start space-x-3 bg-muted/50 p-3 rounded-md border">
                <input type="checkbox" id="is_ruined" name="is_ruined" defaultChecked className="mt-1 w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500" />
                <label htmlFor="is_ruined" className="text-sm font-bold leading-none cursor-pointer">
                  A peça impressa foi perdida / arruinada
                  <p className="text-xs text-muted-foreground font-normal mt-1 leading-relaxed">
                    Deixe marcado se a peça quebrou e você vai descartá-la. <br/>
                    Desmarque se a peça está intacta e você só quer cancelar o acabamento (ela será devolvida ao Estoque de Peças Prontas).
                  </p>
                </label>
              </div>
            </div>
          ) : (
            <>
              {(() => {
                const idsToProcess = failureJob?.inventory_ids?.length ? failureJob.inventory_ids : failureJob?.inventory_id ? [failureJob.inventory_id] : [];
                if (idsToProcess.length > 0) {
                  return idsToProcess.map((invId, idx) => {
                    const inv = inventory.find(i => i.id === invId);
                    if (!inv) return null;
                    return (
                      <div key={idx} className="bg-red-50/50 p-3 rounded-md border border-red-100">
                        <div className="font-bold text-xs mb-2 flex items-center text-red-800"><Package className="w-3 h-3 mr-1" />{inv.material_type} {inv.color}</div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-red-700">{dict?.failure?.failureWaste || 'Desperdício da Falha (g)'}</label>
                          <input required type="number" name={`waste_weight_${invId}`} defaultValue={0} className="w-full p-2 border rounded-md text-sm bg-background font-medium" />
                        </div>
                      </div>
                    );
                  });
                }
                return (
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">{dict?.failure?.failureWaste || 'Desperdício da Falha (g)'}</label>
                    <input required type="number" name="waste_weight_fallback" defaultValue={0} className="w-full p-2 border rounded-md text-sm bg-background font-medium" />
                  </div>
                );
              })()}
            </>
          )}

          {/* Outros Insumos (Opcional) */}
          <div className="p-3 bg-muted/30 border rounded-md space-y-3">
            <h4 className="text-sm font-bold text-muted-foreground flex items-center">
              <Package className="w-4 h-4 mr-2" />
              Outros Insumos Perdidos (Opcional)
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-bold">Insumo Extra</label>
                <select name="extra_supply_id" className="w-full p-2 border rounded-md text-sm bg-background">
                  <option value="">Nenhum</option>
                  {supplies.filter(s => s.quantity > 0).map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.quantity} {s.unit} disp.)</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold">Qtd Perdida</label>
                <input type="number" step="0.01" name="extra_waste" defaultValue={0} className="w-full p-2 border rounded-md text-sm bg-background" />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button type="button" onClick={() => setIsFailureModalOpen(false)} className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted transition-colors">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-md disabled:opacity-50 hover:bg-red-700 transition-colors">
              {isSubmitting ? dict?.failure?.registering || 'Registrando...' : dict?.failure?.registerAbort || 'Registrar Perda e Abortar'}
            </button>
          </div>
        </form>
      </Modal>
      {/* Modal: Skip Print (queued -> finishing) */}
      <Modal isOpen={isSkipModalOpen} onClose={() => !isSubmitting && setIsSkipModalOpen(false)} title="Pular Impressão">
        <form onSubmit={handleSkipPrint} className="space-y-4">
          {(() => {
            const sku = skus.find(s => s.id === skipJob?.sku_id);
            const availableStock = finishedGoods.filter(g => g.sku_id === skipJob?.sku_id).reduce((sum, g) => sum + g.quantity, 0);

            return (
              <>
                <div className="p-4 bg-muted/30 border rounded-md text-center">
                  <p className="text-sm font-medium mb-1">Produto:</p>
                  <p className="font-bold text-primary">{sku?.name || 'Desconhecido'}</p>
                </div>

                {availableStock >= 1 ? (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                    <h3 className="font-bold text-sm text-green-800 mb-1 flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Estoque Disponível
                    </h3>
                    <p className="text-xs text-green-700">
                      Você tem <strong>{availableStock} unidade(s)</strong> deste produto em estoque. Ao confirmar, 1 unidade será baixada do estoque de peças prontas e esta tarefa pulará a impressão, indo direto para o Acabamento.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
                    <h3 className="font-bold text-sm text-amber-800 mb-1 flex items-center">
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Sem Estoque no Sistema
                    </h3>
                    <p className="text-xs text-amber-700">
                      O sistema não encontrou esta peça em estoque. Se você tem a peça física pronta em mãos (ex: impressa fora do sistema), você pode forçar o pulo da impressão.
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                  <button type="button" onClick={() => setIsSkipModalOpen(false)} className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted transition-colors">Cancelar</button>
                  <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md disabled:opacity-50 hover:bg-primary/90 transition-colors">
                    {isSubmitting ? 'Processando...' : 'Pular Impressão'}
                  </button>
                </div>
              </>
            );
          })()}
        </form>
      </Modal>

    </PageLayout>
  );
}
