import {
    Component,
    Input,
    Output,
    EventEmitter,
    ViewChild,
    ElementRef,
    forwardRef,
    Renderer2,
    OnInit,
    OnChanges, OnDestroy, AfterViewInit
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { vdCanvasUpdate, UPDATE_TYPE } from "./vd-canvas-update.model";
import { vdCanvasService } from "./vd-canvas.service";
import { Subscription } from "rxjs/Subscription";
import { vdCanvasTextToolbarSettings } from './vd-canvas-text-toolbar.component';

export interface EventPositionPoint {
    x: number,
    y: number
}

export interface vdCanvasOptions {
    batchUpdateTimeoutDuration?: number
    imageUrl?: string
    aspectRatio?: number
    strokeColor?: string
    lineWidth?: number
    drawButtonEnabled?: boolean
    drawButtonClass?: string
    drawButtonText?: string
    clearButtonEnabled?: boolean
    clearButtonClass?: string
    clearButtonText?: string
    undoButtonEnabled?: boolean
    undoButtonClass?: string
    undoButtonText?: string
    redoButtonEnabled?: boolean
    redoButtonClass?: string
    redoButtonText?: string
    saveDataButtonEnabled?: boolean
    saveDataButtonClass?: string
    saveDataButtonText?: string
    colorPickerEnabled?: boolean
    shouldDownloadDrawing?: boolean
    startingColor?: string
    canvasCurser:any;
}

@Component({
    selector: 'app-vd-canvas',
    templateUrl: './vd-canvas.component.html',
    styleUrls: ['./vd-canvas.component.css'],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => VdCanvasComponent),
            multi: true
        }
    ]
})
export class VdCanvasComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy, ControlValueAccessor {
    diagram: any;
    fontSize: string;
    fontFamily: string;
    enableCanvasText:boolean = false;
    canvasTextSettings:vdCanvasTextToolbarSettings;
    pencilActive:boolean = true;
    brushActive:boolean = false;
    enableEraser:boolean = false;
    eraserColor:string = '#ffffff';
    canvasCurser=document.createElement('canvas');
    @Input() viewOnly:boolean = false;
    @Input() options: vdCanvasOptions;

    //Number of ms to wait before sending out the updates as an array
    @Input() batchUpdateTimeoutDuration: number = 100;

    @Input() imageUrl: string;
    @Input() aspectRatio: number;

    @Input() drawButtonClass: string;
    @Input() clearButtonClass: string;
    @Input() undoButtonClass: string;
    @Input() redoButtonClass: string;
    @Input() saveDataButtonClass: string;

    @Input() drawButtonText: string = "";
    @Input() clearButtonText: string = "";
    @Input() undoButtonText: string = "";
    @Input() redoButtonText: string = "";
    @Input() saveDataButtonText: string = "";

    @Input() drawButtonEnabled: boolean = true;
    @Input() clearButtonEnabled: boolean = true;
    @Input() undoButtonEnabled: boolean = false;
    @Input() redoButtonEnabled: boolean = false;
    @Input() saveDataButtonEnabled: boolean = false;

    @Input() shouldDownloadDrawing: boolean = true;

    @Input() colorPickerEnabled: boolean = false;

    @Input() lineWidth: number = 1;
    @Input() strokeColor: string = "rgb(216, 184, 0)";

    @Input() startingColor: string = "#fff";

    @Output() onClear = new EventEmitter<any>();
    @Output() onUndo = new EventEmitter<any>();
    @Output() onRedo = new EventEmitter<any>();
    @Output() onBatchUpdate = new EventEmitter<vdCanvasUpdate[]>();
    @Output() onImageLoaded = new EventEmitter<any>();
    @Output() onSave = new EventEmitter<string | Blob>();

    @ViewChild('canvas') canvas: ElementRef;

    context: CanvasRenderingContext2D;

    private _imageElement: HTMLImageElement;

    private _shouldDraw = false;
    private _canDraw = true;

    private _clientDragging = false;

    private _lastUUID: string;
    private _lastPositionForUUID: Object = {};

    private _undoStack: string[] = []; //Stores the value of start and count for each continuous stroke
    private _redoStack: string[] = [];
    private _drawHistory: vdCanvasUpdate[] = [];
    private _batchUpdates: vdCanvasUpdate[] = [];
    private _updatesNotDrawn: any = [];

    private _updateTimeout: any;

    private _canvasServiceSubscriptions: Subscription[] = [];

    mouseEventPosition: EventPositionPoint;

    constructor(private _canvasService: vdCanvasService, private renderer: Renderer2) {
    }

    writeValue(value: string) {
        this.diagram = value;
    }

    onChange = (_) => { };
    onTouched = () => { };
    registerOnChange(fn: (_: any) => void): void {
        this.onChange = fn;
    }
    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    ngOnInit(): void {
        this._initInputsFromOptions(this.options);
        this._initCanvasEventListeners();
        this._initCanvasServiceObservables();
        this.context = this.canvas.nativeElement.getContext("2d");
        this._calculateCanvasWidthAndHeight();
        this._shouldDraw = !this.viewOnly;
        this.brushSizeUpdate();
    }

    ngAfterViewInit(): void {
        this._calculateCanvasWidthAndHeight();
        this._drawStartingColor();
    }

    private _initInputsFromOptions(options: vdCanvasOptions) {
        if (options) {
            if (!this._isNullOrUndefined(options.batchUpdateTimeoutDuration)) this.batchUpdateTimeoutDuration = options.batchUpdateTimeoutDuration;
            if (!this._isNullOrUndefined(options.imageUrl)) {
                this.imageUrl = options.imageUrl
                this._loadImage();
            };
            if (!this._isNullOrUndefined(options.aspectRatio)) this.aspectRatio = options.aspectRatio;
            if (!this._isNullOrUndefined(options.drawButtonClass)) this.drawButtonClass = options.drawButtonClass;
            if (!this._isNullOrUndefined(options.clearButtonClass)) this.clearButtonClass = options.clearButtonClass;
            if (!this._isNullOrUndefined(options.undoButtonClass)) this.undoButtonClass = options.undoButtonClass;
            if (!this._isNullOrUndefined(options.redoButtonClass)) this.redoButtonClass = options.redoButtonClass;
            if (!this._isNullOrUndefined(options.saveDataButtonClass)) this.saveDataButtonClass = options.saveDataButtonClass;
            if (!this._isNullOrUndefined(options.drawButtonText)) this.drawButtonText = options.drawButtonText;
            if (!this._isNullOrUndefined(options.clearButtonText)) this.clearButtonText = options.clearButtonText;
            if (!this._isNullOrUndefined(options.undoButtonText)) this.undoButtonText = options.undoButtonText;
            if (!this._isNullOrUndefined(options.redoButtonText)) this.redoButtonText = options.redoButtonText;
            if (!this._isNullOrUndefined(options.saveDataButtonText)) this.saveDataButtonText = options.saveDataButtonText;
            if (!this._isNullOrUndefined(options.drawButtonEnabled)) this.drawButtonEnabled = options.drawButtonEnabled;
            if (!this._isNullOrUndefined(options.clearButtonEnabled)) this.clearButtonEnabled = options.clearButtonEnabled;
            if (!this._isNullOrUndefined(options.undoButtonEnabled)) this.undoButtonEnabled = options.undoButtonEnabled;
            if (!this._isNullOrUndefined(options.redoButtonEnabled)) this.redoButtonEnabled = options.redoButtonEnabled;
            if (!this._isNullOrUndefined(options.saveDataButtonEnabled)) this.saveDataButtonEnabled = options.saveDataButtonEnabled;
            if (!this._isNullOrUndefined(options.colorPickerEnabled)) this.colorPickerEnabled = options.colorPickerEnabled;
            if (!this._isNullOrUndefined(options.lineWidth)) this.lineWidth = options.lineWidth;
            if (!this._isNullOrUndefined(options.strokeColor)) this.strokeColor = options.strokeColor;
            if (!this._isNullOrUndefined(options.shouldDownloadDrawing)) this.shouldDownloadDrawing = options.shouldDownloadDrawing;
            if (!this._isNullOrUndefined(options.startingColor)) this.startingColor = options.startingColor;
        }
    }

    private _isNullOrUndefined(property: any): boolean {
        return property === null || property === undefined;
    }

    private _initCanvasEventListeners(): void {
        window.addEventListener("resize", this._redrawCanvasOnResize.bind(this), false);
        window.addEventListener("keydown", this._canvasKeyDown.bind(this), false);
    }

    private _initCanvasServiceObservables(): void {
        this._canvasServiceSubscriptions.push(this._canvasService.canvasDrawSubject$
            .subscribe(updates => this.drawUpdates(updates)));
        this._canvasServiceSubscriptions.push(this._canvasService.canvasClearSubject$
            .subscribe(() => this.clearCanvas()));
        this._canvasServiceSubscriptions.push(this._canvasService.canvasUndoSubject$
            .subscribe(() => this.undo()));
        this._canvasServiceSubscriptions.push(this._canvasService.canvasRedoSubject$
            .subscribe(() => this.redo()));
    }

    private _calculateCanvasWidthAndHeight(): void {
        this.context.canvas.width = this.canvas.nativeElement.parentNode.clientWidth;
        if (this.aspectRatio) {
            this.context.canvas.height = this.canvas.nativeElement.parentNode.clientWidth * this.aspectRatio;
        } else {
            this.context.canvas.height = this.canvas.nativeElement.parentNode.clientHeight;
        }
    }

    ngOnChanges(changes: any): void {
        if (changes.imageUrl && changes.imageUrl.currentValue != changes.imageUrl.previousValue) {
            if (changes.imageUrl.currentValue != null) {
                this._loadImage();
            } else {
                this._canDraw = false;
                this._redrawBackground();
            }
        }

        if (changes.options && changes.options.currentValue != changes.options.previousValue) {
            this._initInputsFromOptions(changes.options.currentValue);
        }
    }

    private _loadImage(callbackFn?: any): void {
        this._canDraw = false;
        this._imageElement = new Image();
        this._imageElement.addEventListener("load", () => {
            this.context.save();
            this._drawImage(this.context, this._imageElement, 0, 0, this.context.canvas.width, this.context.canvas.height, 0.5, 0.5);
            this.context.restore();
            this._drawMissingUpdates();
            this._canDraw = true;
            callbackFn && callbackFn();
            this.onImageLoaded.emit(true);
        });
        this._imageElement.src = this.imageUrl;
        this.diagram = this.imageUrl;
        this.onChange(this.diagram);
    }

    clearCanvasLocal(): void {
        this.clearCanvas();
        this.onClear.emit(true);
    }

    clearCanvas(): void {
        this._removeCanvasData();
        this._redoStack = [];
    }

    private _removeCanvasData(callbackFn?: any): void {
        this._clientDragging = false;
        this._drawHistory = [];
        this._undoStack = [];
        this._redrawBackground(callbackFn);
    }

    private _redrawBackground(callbackFn?: any): void {
        if (this.context) {
            this.context.setTransform(1, 0, 0, 1, 0, 0);
            this.context.clearRect(0, 0, this.context.canvas.width, this.context.canvas.height);
            this._drawStartingColor();
            if (this.imageUrl) {
                this._loadImage(callbackFn);
            } else {
                callbackFn && callbackFn();
            }
        }
    }

    private _drawStartingColor() {
        this.context.fillStyle = this.startingColor;
        this.context.fillRect(0, 0, this.context.canvas.width, this.context.canvas.height);
    }

    getShouldDraw(): boolean {
        return this._shouldDraw;
    }

    toggleShouldDraw(): void {
        if(this.pencilActive){
            this._shouldDraw = !this._shouldDraw;
        } else{
            this._shouldDraw = true;
        }      
        this.pencilActive = true;
        this.brushActive = false;
        this.enableEraser = false;
        this.lineWidth=1;
        this.brushSizeUpdate();

    }
    toggleShouldDrawbrush(): void {
        if(this.brushActive && !this.enableEraser){
            this._shouldDraw = !this._shouldDraw;
        } else{
            this._shouldDraw = true;
        }
        this.pencilActive = false;
        this.brushActive = true;
        this.enableEraser = false;
        if(this.lineWidth<2){
            this.lineWidth = 2;
        }
    }
    toggleShouldErase(): void {
        if(this.enableEraser){
            this._shouldDraw = !this._shouldDraw;
        } else{
            this._shouldDraw = true;
        }
        this.pencilActive = false;
        this.brushActive = true;
        this.enableEraser = !this.enableEraser;
        if(this.lineWidth<2){
            this.lineWidth = 2;
        }
    }
    brushSizeUpdate(): void {
        if(this.pencilActive==true && this._shouldDraw){
            this.context.canvas.style.cursor = 'url(./assets/img/pencil_curser.png) 0 18, auto';        
        }else{      
        this.canvasCurser.width = this.canvasCurser.height = this.lineWidth;
        var ctx = this.canvasCurser.getContext('2d');
        ctx.beginPath();
        ctx.arc(this.canvasCurser.width/2, this.canvasCurser.width/2, this.canvasCurser.width/2, 0, 2 * Math.PI);
        ctx.stroke();
        this.context.canvas.style.cursor = 'url(' + this.canvasCurser.toDataURL() + ') '+this.canvasCurser.height/2+' '+this.canvasCurser.height/2+', auto';        
     }
    }

    setShouldDraw(shouldDraw: boolean): void {
        this._shouldDraw = shouldDraw;
    }

    changeColor(newStrokeColor: string): void {
        this.strokeColor = newStrokeColor;
    }

    undoLocal(): void {
        this.undo();
        this.onUndo.emit();
    }

    undo(): void {
        if (!this._undoStack.length) return;

        let updateUUID = this._undoStack.pop();
        this._undoCanvas(updateUUID);
    }

    private _undoCanvas(updateUUID: string): void {
        this._redoStack.push(updateUUID);

        this._drawHistory.forEach((update: vdCanvasUpdate) => {
            if (update.getUUID() === updateUUID) {
                update.setVisible(false);
            }
        });

        this._redrawHistory();
    }

    redoLocal(): void {
        this.redo();
        this.onRedo.emit();
    }

    redo(): void {
        if (!this._redoStack.length) return;

        let updateUUID = this._redoStack.pop();
        this._redoCanvas(updateUUID);
    }

    private _redoCanvas(updateUUID: string): void {
        this._undoStack.push(updateUUID);

        this._drawHistory.forEach((update: vdCanvasUpdate) => {
            if (update.getUUID() === updateUUID) {
                update.setVisible(true);
            }
        });

        this._redrawHistory();
    }

    canvasUserEvents(event: any): void {
        if ((!this._shouldDraw || !this._canDraw) && !this.enableCanvasText) {
            //Ignore all if we didn't click the _draw! button or the image did not load
            return;
        }

        if ((event.type === 'mousemove' || event.type === 'touchmove' || event.type === 'mouseout') && !this._clientDragging) {
            // Ignore mouse move Events if we're not dragging
            return;
        }

        if (event.target == this.canvas.nativeElement) {
            event.preventDefault();
        }

        let update: vdCanvasUpdate;
        let updateType: number;
        let eventPosition: EventPositionPoint = this._getCanvasEventPosition(event);
        this.mouseEventPosition = eventPosition;

        switch (event.type) {
            case 'mousedown':
            case 'touchstart':
                this._clientDragging = true;
                this._lastUUID = eventPosition.x + eventPosition.y + Math.random().toString(36);
                updateType = UPDATE_TYPE.start;
                break;
            case 'mousemove':
            case 'touchmove':
                if (!this._clientDragging) {
                    return;
                }
                updateType = UPDATE_TYPE.drag;
                break;
            case 'touchcancel':
            case 'mouseup':
            case 'touchend':
            case 'mouseout':
                this._clientDragging = false;
                updateType = UPDATE_TYPE.stop;
                break;
        }

        if(this.enableCanvasText)
        {
            this.CreateInputText();
            return;
        }

        let color:string = this.enableEraser?this.eraserColor:this.strokeColor;

        update = new vdCanvasUpdate(eventPosition.x, eventPosition.y, updateType, color, this._lastUUID, true);
        this._draw(update);
        this._prepareToSendUpdate(update, eventPosition.x, eventPosition.y);
        this.diagram = this.generateCanvasDataUrl();
        this.onChange(this.diagram);
        this.onSave.emit(this.diagram);
    }

    private _getCanvasEventPosition(eventData: any): EventPositionPoint {
        let canvasBoundingRect = this.context.canvas.getBoundingClientRect();

        let hasTouches = (eventData.touches && eventData.touches.length) ? eventData.touches[0] : null;
        if (!hasTouches)
            hasTouches = (eventData.changedTouches && eventData.changedTouches.length) ? eventData.changedTouches[0] : null;

        let event = hasTouches ? hasTouches : eventData;

        return {
            x: event.clientX - canvasBoundingRect.left,
            y: event.clientY - canvasBoundingRect.top
        }
    }

    private _prepareToSendUpdate(update: vdCanvasUpdate, eventX: number, eventY: number): void {
        update.setX(eventX / this.context.canvas.width);
        update.setY(eventY / this.context.canvas.height);
        this._prepareUpdateForBatchDispatch(update);
    }


    private _canvasKeyDown(event: any): void {
        if (event.ctrlKey || event.metaKey) {
            if (event.keyCode === 90 && this.undoButtonEnabled) {
                event.preventDefault();
                this.undo();
            }
            if (event.keyCode === 89 && this.redoButtonEnabled) {
                event.preventDefault();
                this.redo();
            }
            if (event.keyCode === 83 || event.keyCode === 115) {
                event.preventDefault();
                this.saveLocal();
            }
        }
    }

    private _redrawCanvasOnResize(): void {
        this._calculateCanvasWidthAndHeight();
        this._redrawHistory();
    }

    private _redrawHistory(): void {
        let updatesToDraw = [].concat(this._drawHistory);

        this._removeCanvasData(() => {
            updatesToDraw.forEach((update: vdCanvasUpdate) => {
                this._draw(update, true);
            });
        });

        // this.diagram = this.generateCanvasDataUrl();
        // this.onSave.emit(this.diagram);
    }

    private _draw(update: vdCanvasUpdate, mappedCoordinates?: boolean): void {
        this._drawHistory.push(update);

        let xToDraw = (mappedCoordinates) ? (update.getX() * this.context.canvas.width) : update.getX();
        let yToDraw = (mappedCoordinates) ? (update.getY() * this.context.canvas.height) : update.getY();

        if (update.getType() === UPDATE_TYPE.drag) {
            let lastPosition = this._lastPositionForUUID[update.getUUID()];

            this.context.save();
            this.context.beginPath();
            this.context.lineWidth = this.lineWidth;

            if (update.getVisible()) {
                this.context.strokeStyle = update.getStrokeColor() || this.strokeColor;
            } else {
                this.context.strokeStyle = "rgba(0,0,0,0)";
            }
            this.context.lineJoin = "round";

            this.context.moveTo(lastPosition.x, lastPosition.y);

            this.context.lineTo(xToDraw, yToDraw);
            this.context.closePath();
            this.context.stroke();
            this.context.restore();
        } else if (update.getType() === UPDATE_TYPE.stop && update.getVisible()) {
            this._undoStack.push(update.getUUID());
            delete this._lastPositionForUUID[update.getUUID()];
        }

        if (update.getType() === UPDATE_TYPE.start || update.getType() === UPDATE_TYPE.drag) {
            this._lastPositionForUUID[update.getUUID()] = {
                x: xToDraw,
                y: yToDraw
            };
        }
    }

    private _prepareUpdateForBatchDispatch(update: vdCanvasUpdate): void {
        this._batchUpdates.push(update);
        if (!this._updateTimeout) {
            this._updateTimeout = setTimeout(() => {
                this.onBatchUpdate.emit(this._batchUpdates);
                this._batchUpdates = [];
                this._updateTimeout = null;
            }, this.batchUpdateTimeoutDuration);
        }
    };

    drawUpdates(updates: vdCanvasUpdate[]): void {
        if (this._canDraw) {
            this._drawMissingUpdates();
            updates.forEach((update: vdCanvasUpdate) => {
                this._draw(update, true);
            });
        } else {
            this._updatesNotDrawn = this._updatesNotDrawn.concat(updates);
        }
    };

    private _drawMissingUpdates(): void {
        if (this._updatesNotDrawn.length > 0) {
            let updatesToDraw = this._updatesNotDrawn;
            this._updatesNotDrawn = [];

            updatesToDraw.forEach((update: vdCanvasUpdate) => {
                this._draw(update, true);
            });
        }
    }

    private _drawImage(context: any, image: any, x: number, y: number, width: number, height: number, offsetX: number, offsetY: number): void {
        if (arguments.length === 2) {
            x = y = 0;
            width = context.canvas.width;
            height = context.canvas.height;
        }

        offsetX = typeof offsetX === 'number' ? offsetX : 0.5;
        offsetY = typeof offsetY === 'number' ? offsetY : 0.5;

        if (offsetX < 0) offsetX = 0;
        if (offsetY < 0) offsetY = 0;
        if (offsetX > 1) offsetX = 1;
        if (offsetY > 1) offsetY = 1;

        let imageWidth = image.width;
        let imageHeight = image.height;
        let radius = Math.min(width / imageWidth, height / imageHeight);
        let newWidth = imageWidth * radius;
        let newHeight = imageHeight * radius;
        let finalDrawX: any;
        let finalDrawY: any;
        let finalDrawWidth: any;
        let finalDrawHeight: any;
        let aspectRatio = 1;

        // decide which gap to fill
        if (newWidth < width) aspectRatio = width / newWidth;
        if (Math.abs(aspectRatio - 1) < 1e-14 && newHeight < height) aspectRatio = height / newHeight;
        newWidth *= aspectRatio;
        newHeight *= aspectRatio;

        // calculate source rectangle
        finalDrawWidth = imageWidth / (newWidth / width);
        finalDrawHeight = imageHeight / (newHeight / height);

        finalDrawX = (imageWidth - finalDrawWidth) * offsetX;
        finalDrawY = (imageHeight - finalDrawHeight) * offsetY;

        // make sure the source rectangle is valid
        if (finalDrawX < 0) finalDrawX = 0;
        if (finalDrawY < 0) finalDrawY = 0;
        if (finalDrawWidth > imageWidth) finalDrawWidth = imageWidth;
        if (finalDrawHeight > imageHeight) finalDrawHeight = imageHeight;

        // fill the image in destination rectangle
        context.drawImage(image, finalDrawX, finalDrawY, finalDrawWidth, finalDrawHeight, x, y, width, height);
    }

    generateCanvasDataUrl(returnedDataType: string = "image/png", returnedDataQuality: number = 1): string {
        return this.context.canvas.toDataURL(returnedDataType, returnedDataQuality);
    }

    generateCanvasBlob(callbackFn: any, returnedDataType: string = "image/png", returnedDataQuality: number = 1): void {
        this.context.canvas.toBlob((blob: Blob) => {
            callbackFn && callbackFn(blob, returnedDataType);
        }, returnedDataType, returnedDataQuality);
    }

    downloadCanvasImage(returnedDataType: string = "image/png", downloadData?: string | Blob): void {
        let downloadLink = document.createElement('a');
        downloadLink.setAttribute('href', downloadData ? <string>downloadData : this.generateCanvasDataUrl(returnedDataType));
        downloadLink.setAttribute('download', "canvas_drawing_" + new Date().valueOf() + this._generateDataTypeString(returnedDataType));
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        // if (window.navigator.msSaveOrOpenBlob === undefined) {
        //       let downloadLink = document.createElement('a');
        //       downloadLink.setAttribute('href', downloadData ? <string>downloadData : this.generateCanvasDataUrl(returnedDataType));
        //       downloadLink.setAttribute('download', "canvas_drawing_" + new Date().valueOf() + this._generateDataTypeString(returnedDataType));
        //       document.body.appendChild(downloadLink);
        //       downloadLink.click();
        //       document.body.removeChild(downloadLink);
        //   } else {
        //       // IE-specific code
        //       if (downloadData) {
        //           this._saveCanvasBlob(<Blob>downloadData, returnedDataType);
        //       } else {
        //           this.generateCanvasBlob(this._saveCanvasBlob.bind(this), returnedDataType);
        //       }
        //   }
    }

    private _saveCanvasBlob(blob: Blob, returnedDataType: string = "image/png"): void {
        window.navigator.msSaveOrOpenBlob(blob, "canvas_drawing_" + new Date().valueOf() + this._generateDataTypeString(returnedDataType));
    }

    generateCanvasData(callback: any, returnedDataType: string = "image/png", returnedDataQuality: number = 1): void {
        callback && callback(this.generateCanvasDataUrl(returnedDataType, returnedDataQuality));
        // if (window.navigator.msSaveOrOpenBlob === undefined) {
        //     callback && callback(this.generateCanvasDataUrl(returnedDataType, returnedDataQuality))
        // } else {
        //     this.generateCanvasBlob(callback, returnedDataType, returnedDataQuality);
        // }
    }

    saveLocal(returnedDataType: string = "image/png"): void {
        this.generateCanvasData((generatedData: string | Blob) => {
            this.diagram = generatedData.toString();
            this.onChange(this.diagram);
            this.onSave.emit(generatedData);

            if (this.shouldDownloadDrawing) {
                this.downloadCanvasImage(returnedDataType, generatedData);
            }
        });
    }

    private _generateDataTypeString(returnedDataType: string): string {
        if (returnedDataType) {
            return "." + returnedDataType.split('/')[1];
        }

        return "";
    }

    private _unsubscribe(subscription: Subscription): void {
        if (subscription) subscription.unsubscribe();
    }

    ngOnDestroy(): void {
        this._canvasServiceSubscriptions.forEach(subscription => this._unsubscribe(subscription));
    }

    canvasTextClick(){
        this.enableCanvasText = !this.enableCanvasText;
    }

    onToolbarSettingsChange(settings:vdCanvasTextToolbarSettings){
        this.canvasTextSettings = settings;
    }
    onBrushToolbarSettingsChange(lineWidth:number){
        this.lineWidth = lineWidth;
        this.brushSizeUpdate();
    }

    CreateInputText() {        
        let drawStatus = this._shouldDraw;
        this._shouldDraw = false;
        const canvasText = this.renderer.createElement('input');
        this.renderer.setAttribute(canvasText, 'type', 'Text');
        this.renderer.setAttribute(canvasText, 'id', 'textCanvas');
        this.renderer.setStyle(canvasText, 'color', this.strokeColor);
        this.renderer.setStyle(canvasText, 'font-family', this.canvasTextSettings.fontFamily);
        this.renderer.setStyle(canvasText, 'font-size', `${this.canvasTextSettings.fontSize}px`);
        this.renderer.setStyle(canvasText, 'top', `${this.mouseEventPosition.y}px`);
        this.renderer.setStyle(canvasText, 'left', `${this.mouseEventPosition.x}px`);
        this.renderer.appendChild(this.canvas.nativeElement.parentElement, canvasText);
        (<HTMLInputElement>canvasText).focus();

        this.renderer.listen(canvasText, 'blur', () => {            
            this.context.font = `${this.canvasTextSettings.fontSize}px ${this.canvasTextSettings.fontFamily}`;
            this.context.fillStyle = this.strokeColor;

            this.context.fillText(canvasText.value, this.mouseEventPosition.x, this.mouseEventPosition.y);
            let update: vdCanvasUpdate;

            update = new vdCanvasUpdate(this.mouseEventPosition.x,this.mouseEventPosition.y, UPDATE_TYPE.stop, this.strokeColor, this._lastUUID, true);
            this._draw(update);
            this._prepareToSendUpdate(update, this.mouseEventPosition.x, this.mouseEventPosition.y);
            this.diagram = this.generateCanvasDataUrl();
            this.onChange(this.diagram);
            this.onSave.emit(this.diagram);

            this.renderer.removeChild(this.canvas.nativeElement.parentElement, canvasText);
            this._shouldDraw = drawStatus;
            this.enableCanvasText = false;
        });
    }
}