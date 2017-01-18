(function() { // template from http://www.jeromecukier.net/blog/2013/11/20/getting-beyond-hello-world-with-d3/
    vis={};
    var width,height;
    var chart,svg;
    var defs, style;
    var slider, step, maxStep, running;
    var backCol, fontCol;
    var radius;
    var cWidth;
    var lighting;

    var radians = Math.PI/180;
    var padding = 2;
    var ringPad = 3;
    var mvAngle = 18 * radians; //angle to offset start, converted from degrees to radians
    var legRectSize = 18;
    var legPad = 5;
    var legUnit = legRectSize + legPad;
    var color = ["#fe4365", "#f37251", "#e7b05d", "#dcdb68", "#add171", "#7fba88", "#83af9b", "#A9CBCF"]
 
    vis.init=function(params) {
        if (!params) {params = {}}
        chart = d3.select(params.chart||"#chart"); // placeholder div for svg
        width = params.width || 960;
        height = params.height || 700;
        lighting = params.lighting || "light";
        chart.selectAll("svg")
            .data([{width:width,height:height}]).enter()
            .append("svg");
        svg = d3.select("svg").attr({
            width:function(d) {return d.width},
            height:function(d) {return d.height}
        }) 
        .append("g")
        .attr("class", "gmain")
        .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");
        
        radius = Math.min(width, height) / 2.2;
        cWidth = radius*.05;
 
        vis.loaddata(params);
    } //end of vis.init
         
    vis.loaddata = function(params) {
        if(!params) {params = {}}
          d3.csv(params.data || "BigDataCategories.csv", function(error,csv) {
            vis.data = csv;
            if(running > 0) {vis.start();} else {vis.draw(params);}
         // }) //nothing after d3.csv method, as no reliable way of knowing when that would be executed.
        })
    }
 
    vis.draw = function(params) {
    d3.selectAll(".gmain > *").remove();
        if(params.lighting == "light") {
          backCol = "#fff"; fontCol = "#302e2e";
        } else {
          backCol = "#302e2e"; fontCol = "#FCF9E8";
        };

        d3.select("body").style("background-color", backCol);
        d3.selectAll(".allText").style("color", fontCol);

          //nests data into  objects by role
          roleNest = d3.nest()
            .key(function(d) {
              return d.Role;
            })
            .entries(vis.data);

        //nests data into  objects by OpCo
          opcoNest = d3.nest()
            .key(function(d) { 
              return d.OpCo;
            })
            .entries(vis.data);

        //nests data into  objects by product and renames objects
          productNest = d3.nest() //http://stackoverflow.com/questions/37172184/rename-key-and-values-in-d3-nest
            .key(function(d) {
              return d.Product;
             })
          .entries(vis.data)
          .map(function(group) {
            return {
              dataName: "prodArc",
              name: group.key,
              value: 45
            }
          });
   
        roleLabels = d3.nest()
          .key(function(d) { return d.Role; })
          .key(function(d) { return d.Half; })
           .rollup(function(leaves) { 
             return d3.sum(leaves, function(g) { return g.value;});
           })
          .entries(vis.data); // gives key value pairs
          //.map(vis.data) //map gives associated array

        roleLabels.forEach(function(d) { //http://learnjsdata.com/read_data.html
          d.values.forEach(function(x) {
              x.value = x.values,
              x.dataName = "roleArc";
          });
        });

         console.log("opcoNest",opcoNest);
        // console.log("productNest",productNest);
        // console.log("roleLabels",JSON.stringify(roleLabels));
        console.log("rolenest",roleNest);

          var pie = d3.layout.pie() // for main donuts
              .sort(null)
              .value(function(d) { return d.value; });

          var arc = d3.svg.arc() //for main donuts
              .startAngle(function(d) { return d.startAngle - mvAngle; })
              .endAngle(function(d) { return d.endAngle - mvAngle; });

          var arc2 = d3.svg.arc() //used for role labels
              .startAngle(function(d) { return d.startAngle - 90 * radians; })
              .endAngle(function(d) { return d.endAngle - 90 * radians; });

          var prodArc = d3.svg.arc() //used for product labels
              .startAngle(function(d) { return d.startAngle - mvAngle; })
              .endAngle(function(d) { return d.endAngle - mvAngle; })
              .innerRadius(radius-cWidth*7 )
              .outerRadius(radius + 10);

      //arcs for the role names - drawn first so underneath everything.
          var rn = svg.selectAll("g.rn") //add a group element to put all the arcs in
              .data([{}]) //adds a single element
              .enter()
              .append("g")
              .classed("rn", 1);

          var nameRing = rn.selectAll(".nameRing")
            .data(roleLabels) //gives one g per role (6)
            .enter()
            .append("g")
            .attr("class","nameRing");

          var namePath = nameRing.selectAll(".rolePath")
            .data(function(d) { return pie(d.values); })
            .enter() //gives one top + bottom per g
            .append("path")
            .attr("class","rolePath")
            .attr("stroke", "none")
            .attr("fill", "none")
            .attr("d", stackRings2)
            .each(nameArcs2); 

      //append role names to rings
        var roleText = nameRing.selectAll(".roleText")
          .data(roleLabels)
          .enter()
            .append("text")
          .attr("class", "roleText", "minorText")
           .append("textPath")
          .attr("startOffset","50%")
          .style("text-anchor","middle")
          .style("fill", fontCol)
          .attr("xlink:href",function(d,i,j){ return "#roleArc"+i+j;}) //i and j going to 5
          .text(function(d, i, j) { 
            return d.key.toUpperCase();
          });

    //draw the donuts
        var gs = svg.selectAll(".cellRing")
            .data(roleNest)
            .enter()
            .append("g") //adds one g per ring.
            .attr("class","cellRing");

        var path = gs.selectAll("path")
            .data(function(d) { return pie(d.values); })
            .enter()
            .append("path")
            .attr("class", function(d) { 
                if(+d.data.Present==1) {
                    return "activeDev " + d.data.OpCo.replace(/\s+/g, '')
                }
            })
            .attr("fill", function(d,i) {
              if (d.data.OpCo.indexOf("Blank")== -1) { 
                return d.data.BaseColour; //data is pied, so this gets back to the basic data
                } else { 
                return "none"; }
            })
            .style("opacity", function(d) { 
                  if (+d.data.Present==0) { return 0.07 }
                  else { return 1}
            })
            .attr("d", stackRings)
            .attr("stroke", backCol)
            .attr("stroke-width",padding);

        gs.selectAll(".activeDev")
            .on("mouseover", function(d) {
                d3.select("#tooltip")
                  .style("left", d3.event.pageX + "px")
                  .style("top", d3.event.pageY + "px")           
                d3.select("#toolValue")
                  .text(d.data.OpCo + " | " + d.data.Role);
                d3.select("#toolHead")
                  .text(d.data.Product);
                d3.select("#tooltip").classed("hidden", false);
            })
            .on("mouseout", function(d) {
              d3.select("#tooltip").classed("hidden", true);
            });

      //arcs for the product divisions and text. http://www.visualcinnamon.com/2015/09/placing-text-on-arcs.html
        var ps = svg.selectAll("g.ps")
            .data([{}]) //adds one element only, without failing on redraw.
            .enter()
            .append("g")
            .classed("ps", 1);

        ps.selectAll(".productSlices")
            .data(pie(productNest))
            .enter().append("path")
            .attr("class", "productSlices")
            .attr("d", prodArc)
            .style("fill", "none")
            .attr("stroke","none")
            .attr("stroke-width",padding*3)
            .each(nameArcs);

      //Append the label names on the outside
        ps.selectAll(".productText")
            .data(pie(productNest))
            .enter().append("text")
            .attr("class", "productText")
            //Move the labels below the arcs for those slices with an end angle...
             .attr("dy", function(d,i) { return (d.endAngle > 2.5 && d.endAngle <5.5 ? 18 : -11); })
             .append("textPath")
            .attr("startOffset","50%")
            .style("text-anchor","middle")
            .style("fill", fontCol)
            .attr("xlink:href",function(d,i){return "#prodArc"+i;})
            .text(function(d, i ){
              if (d.data.name.indexOf("Blank")== -1) { 
                return d.data.name.toUpperCase(); 
              } else { return "";}
            });

      //add title
      var titHead = rn.selectAll('.titHead')
            .data([{}])
            .enter()

      titHead.append('text')
            .attr("fill", fontCol)
            .style("font-size", "1.6em")
            .attr("text-anchor", 'middle')
            .attr("x", 0)
            .attr("y", -110)
            .text('thousands of languages');

      titHead.append('text')
            .attr("fill", fontCol)
            .style("font-size", "1.6em")
            .attr("text-anchor", 'middle')
            .attr("x", 0)
            .attr("y", -80)
            .text('hundreds of skills, one team');

      titHead.append('text')
            .attr("fill", fontCol)
            .style("font-size", "2.5em")
            .attr("text-anchor", 'middle')
            .attr("x", 0)
            .attr("y", -20)
            .text('we’re all in the data business');

      //add legend
        var legend =  rn.selectAll('.legend')
            .data(opcoNest)
            .enter()
            .append("g")
            .filter(function(d) { 
              return d.key.indexOf("Blank")== -1;
            })
            .attr("class", "legend")
            .attr("transform", "translate(-" +legRectSize +",50)");

        var legBrk = (opcoNest.length-3)/2-1;


        legend.append('rect')
            .attr('width', legRectSize)
            .attr('height', legRectSize)
            .attr('class','legRect')
            .style('fill', function (d,i) {
              return d.values[0].BaseColour;
            })
            .attr("y", function(d, i) {
                  if (i<=legBrk) {
                    return i * legUnit;  
                  } else {
                    return (i-legBrk-1) * legUnit;
                  }
            })
            .attr("x", function(d, i) {
                if (i<=legBrk) {
                  return 0;  
                } else {
                  return legRectSize+ legPad;
                }
            });

         rn.selectAll(".legRect")
            .on("mouseover", function(d) {
                highlight(d.key.replace(/\s+/g, '')); 
            })
            .on("mouseout", function(d) { 
              highlight(null);
            });

        legend.append('text')
            .attr("fill", fontCol)
            .style("font-size", "0.8em")
            .attr("x", function(d, i) {
                if (i<=legBrk) {
                  return -legPad;
                } else {
                  return legUnit * 2;
                }
             })
            .attr("y", function(d, i) {
                if (i<=legBrk) {
                  return legRectSize-2*padding + i * legUnit;  
                } else {
                  return legRectSize-2*padding + (i-legBrk-1) * legUnit;
                }
             })
            .attr("text-anchor", function(d, i) {
                if (i<=legBrk) {
                  return "end";
                } else {
                  return "start";
                }
             })
            .text(function(d) { return d.key.toUpperCase(); });


        d3.selectAll("input")
          .on("change", change);

        function change() {
          params.lighting = this.value;
          vis.draw(params);
        }

        function highlight(type) { //http://bl.ocks.org/mbostock/3087986
          if (type == null) d3.selectAll(".activeDev").classed("active", false);
          else 
            d3.selectAll(".activeDev").classed("active", true);
            d3.selectAll("." + type).classed("active", false);
        }

        function stackRings2 (d, i, j) { //for fudging role label placement
          if(i==0) { //move radius in or out depending on top or bottom
            return arc2 
              .outerRadius(radius + 2 * padding - cWidth - cWidth * (j))
              .innerRadius(radius + 1 - cWidth- cWidth * (j+1)) (d); //this d looks odd...
          } else {
            return arc2 
              .outerRadius(radius -3 - cWidth * (j))
              .innerRadius(radius +1 - cWidth * (j+1)) (d);
          }
        };

        function stackRings (d, i, j) { //j is ring number. 0-5
            return arc // starts with outer ring and works in
              .outerRadius(radius - (cWidth * j))
              .innerRadius(radius + ringPad - cWidth * (j+1)) (d);
        };

        function nameArcs(d,i) { //used for product divisions
              //A regular expression that captures all in between the start of a string (denoted by ^) 
              //and the first capital letter L
              var firstArcSection = /(^.+?)L/; 
              //The [1] gives back the expression between the () (thus not the L as well) 
              //which is exactly the arc statement
              var newArc = firstArcSection.exec( d3.select(this).attr("d") )[1];
              //Replace all the comma's so that IE can handle it -_-
              //The g after the / is a modifier that "find all matches rather than stopping after the first match"
              newArc = newArc.replace(/,/g , " ");    
          //flip the end and start position for bottom segments
         // console.log(d.endAngle)
          if (d.endAngle > 2.5 && d.endAngle <5.5) {
            var startLoc  = /M(.*?)A/,    //Everything between the capital M and first capital A
              middleLoc   = /A(.*?)0 0 1/,  //Everything between the capital A and 0 0 1
              endLoc    = /0 0 1 (.*?)$/; //Everything between the 0 0 1 and the end of the string (denoted by $)
            //Flip the direction of the arc by switching the start and end point (and sweep flag)
            var newStart = endLoc.exec( newArc )[1];
            var newEnd = startLoc.exec( newArc )[1];
            var middleSec = middleLoc.exec( newArc )[1];
            
            //Build up the new arc notation, set the sweep-flag to 0
            newArc = "M" + newStart + "A" + middleSec + "0 0 0 " + newEnd;
          }//end if

            //Create a new invisible arc that the text can flow along
            ps.append("path")
                .attr("class", d.data.dataName)
                .attr("id", d.data.dataName+i)
                .attr("d", newArc)
                .style("stroke-width", 0)
                .style("fill", "none");
        }; // end nameArcs

        function nameArcs2(d,i,j) { //https://groups.google.com/forum/#!topic/d3-js/VmL_HzEqu50
              var firstArcSection = /(^.+?)L/; 
              var newArc = firstArcSection.exec( d3.select(this).attr("d") )[1];
              newArc = newArc.replace(/,/g , " ");    
          //flip the end and start position for bottom segments
          if (d.endAngle > 190 * radians) {
            var startLoc  = /M(.*?)A/,    //Everything between the capital M and first capital A
              middleLoc   = /A(.*?)0 0 1/,  //Everything between the capital A and 0 0 1
              endLoc    = /0 0 1 (.*?)$/; //Everything between the 0 0 1 and the end of the string (denoted by $)

            var newStart = endLoc.exec( newArc )[1];
            var newEnd = startLoc.exec( newArc )[1];
            var middleSec = middleLoc.exec( newArc )[1];
            //Build up the new arc notation, set the sweep-flag to 0
            newArc = "M" + newStart + "A" + middleSec + "0 0 0 " + newEnd;
          }//end if

            //Create a new invisible arc that the text can flow along
          rn.append("path")
                .attr("class", d.data.dataName)
                .attr("id", d.data.dataName+j+i)
                .attr("d", newArc)
                .style("stroke-width", 0)
                .style("fill", "none");
        }; // end nameArcs2
            
    }
  })(); // end of vis.draw

